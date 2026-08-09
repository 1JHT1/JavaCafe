package com.javacafe.web.security;

import com.javacafe.common.util.JsonUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * 零依赖 HS256 JWT 实现（手写，避免引入 jjwt 依赖）。
 * token 结构：Base64URL(header).Base64URL(payload).Base64URL(signature)
 * payload = {"sub": userId, "exp": 过期时间戳}
 */
public final class JwtUtil {

    private static final String SECRET = "javacafe-hs256-secret-2026";
    private static final long EXPIRATION_MILLIS = 24 * 60 * 60 * 1000L; // 24 小时

    private JwtUtil() {}

    public static String generate(String userId) {
        String header = base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = base64Url(JsonUtils.toJson(new Claims(userId, System.currentTimeMillis() + EXPIRATION_MILLIS)));
        String signingInput = header + "." + payload;
        return signingInput + "." + base64Url(hmacSha256(signingInput));
    }

    /**
     * 解析 token，返回 userId；签名无效或已过期返回 null。
     */
    public static String parseUserId(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;

            String signingInput = parts[0] + "." + parts[1];
            byte[] expected = hmacSha256(signingInput);
            if (!constantTimeEquals(expected, Base64.getUrlDecoder().decode(parts[2]))) {
                return null;
            }

            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            Claims claims = JsonUtils.fromJson(payload, Claims.class);
            if (claims == null || claims.exp() < System.currentTimeMillis()) {
                return null;
            }
            return claims.sub();
        } catch (Exception e) {
            return null;
        }
    }

    private record Claims(String sub, long exp) {}

    private static byte[] hmacSha256(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC failed", e);
        }
    }

    private static String base64Url(String raw) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private static String base64Url(byte[] raw) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }

    private static boolean constantTimeEquals(byte[] a, byte[] b) {
        return MessageDigest.isEqual(a, b);
    }
}
