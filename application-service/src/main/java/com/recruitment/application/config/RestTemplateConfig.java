package com.recruitment.application.config;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    /** @LoadBalanced permet d'utiliser des URLs "http://job-service/..." résolues via Eureka.
     *  Utilisé par JobClient / UserClient / SubscriptionClient (services internes enregistrés
     *  dans Eureka). @Primary car c'est le RestTemplate injecté par défaut partout. */
    @Bean
    @Primary
    @LoadBalanced
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    /** RestTemplate SANS load-balancing, pour les appels vers des services hors Eureka avec
     *  une URL host:port classique (ex: matching-service, Python/FastAPI). Avec le RestTemplate
     *  @LoadBalanced ci-dessus, "localhost" dans "http://localhost:8000/..." serait interprété
     *  à tort comme un nom de service Eureka à résoudre -> échec systématique, score toujours null. */
    @Bean
    public RestTemplate plainRestTemplate() {
        return new RestTemplate();
    }
}