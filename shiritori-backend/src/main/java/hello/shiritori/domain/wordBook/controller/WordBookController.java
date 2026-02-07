package hello.shiritori.domain.wordBook.controller;

import hello.shiritori.domain.wordBook.dto.AddWordRequest;
import hello.shiritori.domain.wordBook.dto.WordBookResponse;
import hello.shiritori.domain.wordBook.service.WordBookService;
import hello.shiritori.global.api.ApiResponse;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/wordBooks")
@RequiredArgsConstructor
public class WordBookController {

    private final WordBookService wordBookService;

    @PostMapping
    public ApiResponse<WordBookResponse> addWord(@AuthenticationPrincipal UUID userId,
                                                 @RequestBody AddWordRequest request) {
        WordBookResponse response = wordBookService.save(userId, request.getWord());
        return ApiResponse.ok(response);
    }

    @GetMapping
    public ApiResponse<List<WordBookResponse>> getMyList(@AuthenticationPrincipal UUID userId) {
        List<WordBookResponse> list = wordBookService.getWordBook(userId);
        return ApiResponse.ok(list);
    }

    @DeleteMapping("/{wordBookId}")
    public ApiResponse<Void> deleteWord(@AuthenticationPrincipal UUID userId, @PathVariable Long wordBookId) {

        wordBookService.delete(userId, wordBookId);
        return ApiResponse.ok(null);
    }

}
