package com.recruitment.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String from;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public void sendVerificationEmail(String to, String token) {
        String verificationLink = frontendUrl + "/verify-email?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Vérifiez votre adresse email - RecruitPro");
        message.setText(
                "Bonjour,\n\n" +
                        "Merci de vous être inscrit sur RecruitPro.\n" +
                        "Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :\n\n" +
                        verificationLink + "\n\n" +
                        "Ce lien expire dans 24 heures.\n\n" +
                        "L'équipe RecruitPro"
        );
        mailSender.send(message);
    }

    public void sendPasswordResetEmail(String to, String token) {
        String resetLink = frontendUrl + "/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Réinitialisation de votre mot de passe - RecruitPro");
        message.setText(
                "Bonjour,\n\n" +
                        "Vous avez demandé la réinitialisation de votre mot de passe sur RecruitPro.\n" +
                        "Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :\n\n" +
                        resetLink + "\n\n" +
                        "Ce lien expire dans 1 heure.\n" +
                        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n" +
                        "L'équipe RecruitPro"
        );
        mailSender.send(message);
    }
}