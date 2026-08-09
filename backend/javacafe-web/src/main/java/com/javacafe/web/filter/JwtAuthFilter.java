package com.javacafe.web.filter;

import com.javacafe.web.security.JwtUtil;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
public class JwtAuthFilter implements WebFilter {

    /** 已解析用户 ID 在 Exchange 中的属性键。 */
    public static final String ATTR_USER_ID = "userId";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getAttributes().put(ATTR_USER_ID, "anonymous");
            return chain.filter(exchange);
        }

        String token = authHeader.substring(7);
        String userId = JwtUtil.parseUserId(token);
        if (userId == null) {
            // 无效/过期 token 按匿名处理（面试流程本身不强制登录）
            exchange.getAttributes().put(ATTR_USER_ID, "anonymous");
            return chain.filter(exchange);
        }

        exchange.getAttributes().put(ATTR_USER_ID, userId);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userId, null, null);
        SecurityContext context = new SecurityContextImpl(auth);

        return chain.filter(exchange)
                .contextWrite(ReactiveSecurityContextHolder.withSecurityContext(Mono.just(context)));
    }
}
