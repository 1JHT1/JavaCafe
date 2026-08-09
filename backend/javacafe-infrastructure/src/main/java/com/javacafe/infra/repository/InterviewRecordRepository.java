package com.javacafe.infra.repository;

import com.javacafe.infra.entity.InterviewRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewRecordRepository extends JpaRepository<InterviewRecordEntity, String> {

    List<InterviewRecordEntity> findBySessionIdOrderByRoundNumberAsc(String sessionId);
    List<InterviewRecordEntity> findByUserIdOrderByCreatedAtDesc(String userId);
}
