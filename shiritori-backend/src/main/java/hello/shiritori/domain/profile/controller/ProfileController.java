package hello.shiritori.domain.profile.controller;

import hello.shiritori.domain.profile.dto.NicknameRequest;
import hello.shiritori.domain.profile.dto.ProfileResponse;
import hello.shiritori.global.api.ApiResponse;
import hello.shiritori.domain.profile.service.ProfileService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/me")
    public ApiResponse<ProfileResponse> getMyProfile(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        ProfileResponse response = profileService.getMyProfile(userId);
        return ApiResponse.ok("프로필 조회 성공", response);
    }

    @PostMapping("/nickname")
    public ApiResponse<Void> updateNickname(@AuthenticationPrincipal Jwt jwt,
                                            @RequestBody NicknameRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        profileService.updateProfile(userId, request.getNickname());
        return ApiResponse.ok("닉네임이 설정되었습니다.", null);
    }

}
