package hello.shiritori.domain.game.service;

import static hello.shiritori.domain.game.entity.GameStatus.*;
import static hello.shiritori.domain.game.entity.GameStatus.PLAYING;

import hello.shiritori.domain.game.dto.GameStartRequest;
import hello.shiritori.domain.game.dto.GameStartResponse;
import hello.shiritori.domain.gamTurn.dto.TurnRequest;
import hello.shiritori.domain.gamTurn.dto.TurnResponse;
import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.game.entity.GameStatus;
import hello.shiritori.domain.gamTurn.entity.GameTurn;
import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.global.utils.WordFinder;
import hello.shiritori.global.utils.JapaneseUtils;
import hello.shiritori.global.exception.DuplicateWordException;
import hello.shiritori.global.exception.GameAlreadyException;
import hello.shiritori.global.exception.GameLevelException;
import hello.shiritori.global.exception.GameNotFound;
import hello.shiritori.global.validator.ShiritoriValidator;
import hello.shiritori.global.exception.UserNotFound;
import hello.shiritori.global.exception.WordException;
import hello.shiritori.domain.game.repository.GameRepository;
import hello.shiritori.domain.gamTurn.repository.GameTurnRepository;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.word.repository.WordRepository;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class GameService {

    private static final long TIME_LIMIT_SECONDS = 20;
    public static final String START_WORD = "しりとり";

    private final GameRepository gameRepository;
    private final GameTurnRepository gameTurnRepository;
    private final WordRepository wordRepository;
    private final ProfileRepository profileRepository;

    private final WordFinder wordFinder;
    private final ShiritoriValidator shiritoriValidator;

    public GameStartResponse start(UUID userId, GameStartRequest request) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(UserNotFound::new);

        validateLevel(request.getLevel());

        Game game = Game.create(profile, request.getLevel());
        gameRepository.save(game);

        saveTurn(game, "AI", START_WORD);
        return GameStartResponse.of(game.getId());
    }

    public TurnResponse playTurn(Long gameId, TurnRequest request) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(GameNotFound::new);

        validateGameStatus(game.getStatus());

        String userInput = request.getWord().trim();

        if ("TIME_OVER_SIGNAL".equals(userInput) || game.isTimeOut(TIME_LIMIT_SECONDS)) {
            return loseAndFinishGame(game, TIME_OVER, userInput, "시간 초과! 게임이 종료되었습니다.");
        }

        if (userInput.endsWith("ん") || userInput.endsWith("ン")) {
            return loseAndFinishGame(game, GAME_OVER, userInput, "패배! 'ん'으로 끝나는 단어를 썼습니다.");
        }

        Word userWord = wordFinder.findOrThrow(userInput);

        validateLastWordConnection(game, userWord);
        validateDuplicateWord(game, userWord);

        saveTurn(game, "USER", userWord.getWord());
        game.applyCorrectAnswer(userWord.getLevel());

        if (userWord.endsWithN()) {
            return loseAndFinishGame(game, GAME_OVER, userWord.getWord(), "패배! 'ん'으로 끝나는 단어를 썼습니다.");
        }

        return processAiTurn(game, userWord);
    }

    public void quitGame(Long gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(GameNotFound::new);

        if (game.getStatus() == PLAYING) {
            game.finish(GAME_OVER);
        }
    }

    private void validateLastWordConnection(Game game, Word userWord) {
        String lastWordText = gameTurnRepository.findFirstByGameOrderByCreatedAtDesc(game)
                .map(GameTurn::getWordText)
                .orElseThrow(() -> new WordException("이전 단어 정보를 찾을 수 없습니다."));

        Word lastWord = wordFinder.findOrThrow(lastWordText);

        shiritoriValidator.validateConnection(lastWord, userWord);
    }

    private void validateDuplicateWord(Game game, Word word) {
        if (gameTurnRepository.existsByGameAndWordText(game, word.getWord())) {
            throw new DuplicateWordException("이미 사용된 단어 입니다!");
        }
    }

    private TurnResponse processAiTurn(Game game, Word userWord) {
        String startChar = userWord.getEffectiveEndChar();

        Optional<Word> word = wordRepository.findAiWord(
                game.getId(),
                JapaneseUtils.toHiragana(startChar),
                JapaneseUtils.toKatakana(startChar),
                game.getLevel().name()
        );

        if (word.isEmpty()) {
            return winAndFinishGame(game, userWord.getWord(), "승리! AI가 더 이상 단어를 찾지 못했습니다.");
        }

        Word aiWord = word.get();
        saveTurn(game, "AI", aiWord.getWord());
        game.updateLastTurnTime();

        return TurnResponse.ofSuccess(game, userWord, aiWord);
    }

    private void validateGameStatus(GameStatus status) {
        if (status != PLAYING) {
            throw new GameAlreadyException();
        }
    }

    private void validateLevel(JlptLevel level) {
        if (level == null) {
            throw new GameLevelException();
        }
    }

    private TurnResponse winAndFinishGame(Game game, String word, String message) {
        game.finish(WIN);
        return TurnResponse.ofUserWin(game, wordFinder.findOrThrow(word));
    }

    private TurnResponse loseAndFinishGame(Game game, GameStatus status, String word, String message) {
        game.finish(status);
        return TurnResponse.ofUserLose(game, word, message);
    }

    private void saveTurn(Game game, String speaker, String wordText) {
        int nextTurnNum = (int) gameTurnRepository.countByGame(game) + 1;

        GameTurn turn = GameTurn.of(game, nextTurnNum, speaker, wordText);
        gameTurnRepository.save(turn);
    }

}
