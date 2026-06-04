package com.oremap.backend;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") // APIエンドポイントのパスパターン
                .allowedOrigins("http://localhost:5173") // 許可するReactアプリのURL
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // 許可するHTTPメソッド
                .allowedHeaders("*") // 許可するヘッダー
                .allowCredentials(true); // Cookieなどを許可するか
    }
}
