package hello.shiritori.domain.gamTurn.service;

import hello.shiritori.domain.gamTurn.entity.GameTurn;
import hello.shiritori.domain.gamTurn.repository.GameTurnRepository;
import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.global.exception.WordException;
import hello.shiritori.global.utils.WordFinder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GameTurnService {

    private final GameTurnRepository gameTurnRepository;
    private final WordFinder wordFinder;

    public void save(Game game, String speaker, String wordText) {
        int nextTurnNumber = calculateNextTurnNumber(game);
        GameTurn gameTurn = GameTurn.of(game, nextTurnNumber, speaker, wordText);
        gameTurnRepository.save(gameTurn);
    }

    public Word getLastWordOrThrow(Game game) {
        String lastWordText = gameTurnRepository.findFirstByGameOrderByCreatedAtDesc(game)
                .map(GameTurn::getWordText)
                .orElseThrow(() -> new WordException("이전 단어 정보를 찾을 수 없습니다."));
        return wordFinder.findOrThrow(lastWordText);
    }

    public boolean isWordAlreadyUsed(Game game, String wordText) {
        return gameTurnRepository.existsByGameAndWordText(game, wordText);
    }

    private int calculateNextTurnNumber(Game game) {
        return (int) gameTurnRepository.countByGame(game) + 1;
    }
}
