package com.recruitment.subscription.config;

import com.recruitment.subscription.security.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtService jwtService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Appelé en interne par job-service / application-service (pas de JWT propagé) :
                        // même principe que /api/jobs/{id} (public) consommé par application-service.
                        .requestMatchers("/api/subscriptions/internal/**").permitAll()
                        // ADMIN : gestion des plans + vue globale des souscriptions
                        .requestMatchers(HttpMethod.POST, "/api/subscriptions/plans").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/subscriptions/plans/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/subscriptions/plans/**").hasRole("ADMIN")
                        .requestMatchers("/api/subscriptions/admin/**").hasRole("ADMIN")
                        // COMPANY / CANDIDATE : consulter les plans, souscrire, voir son abonnement
                        .requestMatchers(HttpMethod.GET, "/api/subscriptions/plans/**").authenticated()
                        .requestMatchers("/api/subscriptions/subscribe").hasAnyRole("COMPANY", "CANDIDATE")
                        .requestMatchers("/api/subscriptions/me").hasAnyRole("COMPANY", "CANDIDATE")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public OncePerRequestFilter jwtFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest req,
                                            HttpServletResponse res,
                                            FilterChain chain) throws ServletException, IOException {
                String header = req.getHeader("Authorization");
                if (header != null && header.startsWith("Bearer ")) {
                    String token = header.substring(7);
                    if (jwtService.isTokenValid(token)) {
                        String username = jwtService.extractUsername(token);
                        String role     = jwtService.extractRole(token);
                        Long   userId   = jwtService.extractUserId(token);

                        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                        var auth = new UsernamePasswordAuthenticationToken(username, userId, authorities);
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
                chain.doFilter(req, res);
            }
        };
    }
}
