package com.example.yolpmap.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    private static final String SESSION_AUTH_KEY = "authenticated";
    private static final String FIXED_PASSWORD = "secret123";

    private final String yolpAppId;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public MapController(@Value("${yolp.appid:}") String yolpAppId) {
        this.yolpAppId = yolpAppId;
    }

    @GetMapping("/api/search")
    @ResponseBody
    public ResponseEntity<String> search(@RequestParam String query) {
        if (yolpAppId == null || yolpAppId.isBlank()) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"YOLP appid is not configured\"}");
        }

        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String encodedAppId = URLEncoder.encode(yolpAppId, StandardCharsets.UTF_8);
            URI uri = URI.create("https://map.yahooapis.jp/geocode/V1/geoCoder?appid=" + encodedAppId + "&output=json&query=" + encodedQuery);
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

    @GetMapping("/")
    public String index(HttpSession session) {
        Boolean authenticated = (Boolean) session.getAttribute(SESSION_AUTH_KEY);
        if (authenticated != null && authenticated) {
            return "index";
        }
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String login(HttpSession session, Model model, @RequestParam(required = false) String error) {
        Boolean authenticated = (Boolean) session.getAttribute(SESSION_AUTH_KEY);
        if (authenticated != null && authenticated) {
            return "redirect:/";
        }
        if (error != null) {
            model.addAttribute("errorMessage", "パスワードが違います。もう一度お試しください。");
        }
        return "login";
    }

    @PostMapping("/login")
    public String loginSubmit(@RequestParam String password, HttpSession session) {
        if (FIXED_PASSWORD.equals(password)) {
            session.setAttribute(SESSION_AUTH_KEY, true);
            return "redirect:/";
        }
        return "redirect:/login?error=true";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }
}
