package com.recruitment.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Envoi des emails liés au traitement automatique des candidatures à la
 * clôture d'une offre (voir ApplicationService#processJobClosure) :
 *  - email d'acceptation avec la date d'entretien, pour les candidats retenus ;
 *  - email de refus pour les autres.
 *
 * Ne lève jamais d'exception : un échec d'envoi (SMTP indisponible, etc.) est
 * simplement loggé, pour ne pas bloquer la mise à jour du statut des
 * candidatures en base.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String from;

    public void sendInterviewEmail(String to, String candidateFirstName, String jobTitle,
                                    String companyName, LocalDateTime dateEntretien) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Votre candidature a été retenue - " + jobTitle);
        message.setText(
                "Bonjour " + candidateFirstName + ",\n\n" +
                        "Bonne nouvelle ! Votre candidature pour le poste \"" + jobTitle + "\"" +
                        (companyName != null ? " chez " + companyName : "") + " a été retenue.\n\n" +
                        "Vous êtes convié(e) à un entretien le " +
                        (dateEntretien != null ? dateEntretien.format(DATE_FORMAT) : "(date à confirmer)") + ".\n\n" +
                        "Nous reviendrons vers vous prochainement avec les modalités pratiques de cet entretien.\n\n" +
                        "Félicitations et à bientôt,\n" +
                        "L'équipe RecruitPro"
        );
        send(message, to);
    }

    public void sendRejectionEmail(String to, String candidateFirstName, String jobTitle, String companyName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Votre candidature - " + jobTitle);
        message.setText(
                "Bonjour " + candidateFirstName + ",\n\n" +
                        "Nous vous remercions pour l'intérêt porté au poste \"" + jobTitle + "\"" +
                        (companyName != null ? " chez " + companyName : "") + ".\n\n" +
                        "Après étude attentive de votre candidature, nous sommes au regret de vous informer " +
                        "que nous ne donnerons pas suite pour ce poste.\n\n" +
                        "Nous vous souhaitons beaucoup de succès dans vos recherches et vous encourageons " +
                        "à postuler à nos prochaines offres.\n\n" +
                        "Cordialement,\n" +
                        "L'équipe RecruitPro"
        );
        send(message, to);
    }

    private void send(SimpleMailMessage message, String to) {
        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Échec de l'envoi de l'email à {} : {}", to, e.getMessage());
        }
    }
}
