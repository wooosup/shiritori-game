package hello.shiritori.domain.profile.entity;

import hello.shiritori.global.exception.UserException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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

    @Id
    private UUID id;

    @Column(nullable = true, length = 20, unique = true)
    private String nickname;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Builder
    private Profile(UUID id, String avatarUrl) {
        this.id = id;
        this.nickname = null;
        this.avatarUrl = avatarUrl;
    }

    public static Profile of(UUID id) {
        return Profile.builder()
                .id(id)
                .build();
    }

    public void update(String nickname) {
        validate(nickname);
        this.nickname = nickname;
    }

    private void validate(String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            throw new UserException("닉네임을 입력해주세요.");
        }
        if (nickname.length() > 10) {
            throw new UserException("닉네임은 최대 10자까지 가능합니다.");
        }
    }

}
