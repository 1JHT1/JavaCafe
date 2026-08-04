package com.javacafe.web;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.javacafe")
@EntityScan(basePackages = "com.javacafe.infra.entity")
@EnableJpaRepositories(basePackages = "com.javacafe.infra.repository")
public class JavaCafeApplication {

    public static void main(String[] args) {
        SpringApplication.run(JavaCafeApplication.class, args);
    }
}
