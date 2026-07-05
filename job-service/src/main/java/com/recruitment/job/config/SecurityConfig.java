package com.recruitment.job.config;

import com.recruitment.job.security.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtService jwtService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // lecture publique des offres actives et fichiers logos
                        .requestMatchers(HttpMethod.GET, "/api/jobs", "/api/jobs/{id}", "/api/jobs/files/**").permitAll()
                        // création / modification / archivage → COMPANY uniquement
                        .requestMatchers(HttpMethod.POST, "/api/jobs").hasRole("COMPANY")
                        .requestMatchers(HttpMethod.PUT, "/api/jobs/**").hasRole("COMPANY")
                        .requestMatchers(HttpMethod.PATCH, "/api/jobs/**").hasRole("COMPANY")
                        // offres du recruteur connecté
                        .requestMatchers("/api/jobs/my").hasRole("COMPANY")
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