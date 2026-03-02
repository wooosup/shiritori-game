package hello.shiritori.domain.ranking.controller;

import hello.shiritori.domain.ranking.dto.MyBestRankResponse;
import hello.shiritori.domain.ranking.dto.RankingSummaryResponse;
import hello.shiritori.domain.ranking.service.RankingService;
import hello.shiritori.global.api.ApiResponse;
import java.util.UUID;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/api/ranks")
public class RankingController {

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    @GetMapping("/me")
    public ApiResponse<MyBestRankResponse> getMyBestRank(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ApiResponse.ok(rankingService.getMyBestRank(userId));
    }


    @GetMapping
    public ApiResponse<List<RankingSummaryResponse>> getTopRanks() {
        return ApiResponse.ok(rankingService.getTopRanks());
    }

}
