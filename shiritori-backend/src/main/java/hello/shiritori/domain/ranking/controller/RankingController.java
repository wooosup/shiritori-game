package hello.shiritori.domain.ranking.controller;

import hello.shiritori.domain.ranking.entity.Ranking;
import hello.shiritori.global.api.ApiResponse;
import hello.shiritori.domain.ranking.repository.RankingRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ranks")
@RequiredArgsConstructor
public class RankingController {

    private final RankingRepository repository;

    @GetMapping
    public ApiResponse<List<Ranking>> getTopRanks() {
        return ApiResponse.ok(repository.findTop10UniqueRankings());
    }

}
