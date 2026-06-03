package com.example.yolpmap.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class LoginController {

    private static final String SESSION_AUTH_KEY = "authenticated";
    private static final String FIXED_PASSWORD = "secret123";

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
