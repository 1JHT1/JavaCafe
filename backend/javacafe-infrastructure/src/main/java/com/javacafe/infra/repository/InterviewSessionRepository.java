package com.javacafe.infra.repository;

import com.javacafe.infra.entity.InterviewSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSessionEntity, String> {

    List<InterviewSessionEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    List<InterviewSessionEntity> findByUserIdAndMode(String userId, String mode);
}
