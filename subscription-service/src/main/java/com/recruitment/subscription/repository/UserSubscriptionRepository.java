package com.recruitment.subscription.repository;

import com.recruitment.subscription.model.SubscriptionStatus;
import com.recruitment.subscription.model.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {

    List<UserSubscription> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<UserSubscription> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, SubscriptionStatus status);

    List<UserSubscription> findByStatusAndDateFinBefore(SubscriptionStatus status, LocalDateTime now);

    List<UserSubscription> findAllByOrderByCreatedAtDesc();
}
