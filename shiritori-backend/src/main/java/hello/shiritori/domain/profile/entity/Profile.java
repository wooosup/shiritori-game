package hello.shiritori.domain.profile.entity;

import hello.shiritori.domain.profile.policy.NicknameValidator;
import hello.shiritori.global.exception.UserException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Profile {

    private static final int NICKNAME_CHANGE_COOLDOWN_DAYS = 7;
    private static final int MAX_NICKNAME_LENGTH = 10;

    @Id
    private UUID id;

    @Column(nullable = true, length = 20, unique = true)
    private String nickname;

    @Column(name = "nickname_updated_at")
    private LocalDateTime nicknameUpdatedAt;

    @Builder
    private Profile(UUID id) {
        this.id = id;
        this.nickname = null;
    }

    public static Profile of(UUID id) {
        return Profile.builder()
                .id(id)
                .build();
    }

    public void updateNickname(String newNickname, NicknameValidator nicknameValidator) {
        validateNicknameFormat(newNickname);
        nicknameValidator.validate(newNickname);
        validateNicknameCooldown();

        this.nickname = newNickname;
        this.nicknameUpdatedAt = LocalDateTime.now();
    }

    public boolean hasNoNickname() {
        return nickname == null || nickname.trim().isEmpty();
    }

    public boolean isSameNickname(String otherNickname) {
        return nickname != null && nickname.equals(otherNickname);
    }

    public long getRemainingCooldownDays() {
        if (hasNoNickname() || nicknameUpdatedAt == null) {
            return 0;
        }

        long daysSinceUpdate = ChronoUnit.DAYS.between(nicknameUpdatedAt, LocalDateTime.now());
        long remainingDays = NICKNAME_CHANGE_COOLDOWN_DAYS - daysSinceUpdate;

        return Math.max(0, remainingDays);
    }

    private void validateNicknameFormat(String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            throw new UserException("닉네임을 입력해주세요.");
        }
        if (nickname.length() > MAX_NICKNAME_LENGTH) {
            throw new UserException("닉네임은 최대 " + MAX_NICKNAME_LENGTH + "자까지 가능합니다.");
        }
    }

    private void validateNicknameCooldown() {
        if (hasNoNickname()) {
            return;
        }

        long remainingDays = getRemainingCooldownDays();
        if (remainingDays > 0) {
            throw new UserException("닉네임은 7일에 한 번만 변경할 수 있습니다. (" + remainingDays + "일 남음)");
        }
    }

}
