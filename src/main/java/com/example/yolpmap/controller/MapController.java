package com.example.yolpmap.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@Controller
public class MapController {

    private final String yolpAppId;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public MapController(@Value("${yolp.appid:}") String yolpAppId) {
        this.yolpAppId = yolpAppId;
    }

    @GetMapping("/api/search")
    @ResponseBody
    public ResponseEntity<String> search(@RequestParam String query, @RequestParam(defaultValue = "address") String type) {
        if (yolpAppId == null || yolpAppId.isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"YOLP appid is not configured\"}");
        }

        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String encodedAppId = URLEncoder.encode(yolpAppId, StandardCharsets.UTF_8);
            String endpoint;
            if ("keyword".equalsIgnoreCase(type)) {
                endpoint = "https://map.yahooapis.jp/search/local/V1/localSearch?appid=" + encodedAppId + "&output=json&query=" + encodedQuery + "&results=2";
            } else {
                endpoint = "https://map.yahooapis.jp/geocode/V1/geoCoder?appid=" + encodedAppId + "&output=json&query=" + encodedQuery + "&results=1";
            }
            URI uri = URI.create(endpoint);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return ResponseEntity.status(response.statusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.body());
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return ResponseEntity.status(502)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"YOLP proxy request failed\"}");
        }
    }

}
