package com.javacafe.infra.repository;

import com.javacafe.infra.entity.CheckInEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface CheckInRepository extends JpaRepository<CheckInEntity, String> {

    /** 某用户全部打卡记录，按日期升序 */
    List<CheckInEntity> findByUserIdOrderByCheckInDateAsc(String userId);

    /** 某用户在指定日期集合内的记录（用于批量去重） */
    List<CheckInEntity> findByUserIdAndCheckInDateIn(String userId, Collection<String> checkInDates);
}
