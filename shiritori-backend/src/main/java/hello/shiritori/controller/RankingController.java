package hello.shiritori.controller;

import hello.shiritori.entity.Ranking;
import hello.shiritori.global.api.ApiResponse;
import hello.shiritori.repository.RankingRepository;
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
