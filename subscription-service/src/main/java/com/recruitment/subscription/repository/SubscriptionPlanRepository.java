package com.recruitment.subscription.repository;

import com.recruitment.subscription.model.SubscriptionPlan;
import com.recruitment.subscription.model.SubscriptionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {
    List<SubscriptionPlan> findByType(SubscriptionType type);
    List<SubscriptionPlan> findByTypeAndActiveTrue(SubscriptionType type);
}
