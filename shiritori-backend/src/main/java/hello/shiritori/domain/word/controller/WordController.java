package hello.shiritori.domain.word.controller;

import hello.shiritori.domain.word.dto.WordResponse;
import hello.shiritori.domain.word.service.WordService;
import hello.shiritori.global.api.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/words")
@RequiredArgsConstructor
public class WordController {

    private final WordService wordService;

    @GetMapping("/count")
    public ApiResponse<Long> getWordCount() {
        return ApiResponse.ok(wordService.getTotalWordCount());
    }

    @GetMapping("/random")
    public ApiResponse<List<WordResponse>> getRandomWords() {
        return ApiResponse.ok(wordService.getRandomWordsForBanner());
    }

    @GetMapping("/search")
    public ApiResponse<WordResponse> searchWord(@RequestParam String keyword) {
        return ApiResponse.ok(wordService.searchWord(keyword));
    }

}
