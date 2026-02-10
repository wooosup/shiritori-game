package hello.shiritori.domain.game.service;

import static hello.shiritori.domain.game.entity.GameStatus.GAME_OVER;
import static hello.shiritori.domain.game.entity.GameStatus.PLAYING;
import static hello.shiritori.domain.game.entity.GameStatus.TIME_OVER;
import static hello.shiritori.domain.game.entity.GameStatus.WIN;

import hello.shiritori.domain.gamTurn.dto.TurnRequest;
import hello.shiritori.domain.gamTurn.dto.TurnResponse;
import hello.shiritori.domain.gamTurn.entity.GameTurn;
import hello.shiritori.domain.gamTurn.repository.GameTurnRepository;
import hello.shiritori.domain.game.dto.GameStartRequest;
import hello.shiritori.domain.game.dto.GameStartResponse;
import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.game.entity.GameStatus;
import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.game.repository.GameRepository;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.word.repository.WordRepository;
import hello.shiritori.global.exception.DuplicateWordException;
import hello.shiritori.global.exception.GameAlreadyException;
import hello.shiritori.global.exception.GameException;
import hello.shiritori.global.exception.GameLevelException;
import hello.shiritori.global.exception.GameNotFound;
import hello.shiritori.global.exception.UserNotFound;
import hello.shiritori.global.exception.WordException;
import hello.shiritori.global.utils.JapaneseUtils;
import hello.shiritori.global.utils.WordFinder;
import hello.shiritori.global.validator.ShiritoriValidator;
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
    private static final String SIGNAL_TIME_OVER = "TIME_OVER_SIGNAL";
    private static final String SPEAKER_AI = "AI";
    private static final String SPEAKER_USER = "USER";

    private final GameRepository gameRepository;
    private final GameTurnRepository gameTurnRepository;
    private final WordRepository wordRepository;
    private final ProfileRepository profileRepository;

    private final WordFinder wordFinder;
    private final ShiritoriValidator shiritoriValidator;

    public GameStartResponse start(UUID userId, GameStartRequest request) {
        Profile profile = findProfileOrThrow(userId);
        validateLevel(request.getLevel());

        Game game = createAndSaveGame(profile, request.getLevel());
        Word startWord = findStartWord(game.getLevel());

        saveTurn(game, SPEAKER_AI, startWord.getWord());

        return GameStartResponse.of(
                game.getId(),
                startWord.getWord(),
                startWord.getReading(),
                startWord.getMeaning()
        );
    }

    public TurnResponse playTurn(Long gameId, TurnRequest request) {
        Game game = findGameOrThrow(gameId);
        validateGameIsPlaying(game);

        String userInput = request.getWord().trim();

        if (isTimeOver(game, userInput)) {
            return loseAndFinishGame(game, TIME_OVER, userInput, "시간 초과! 게임이 종료되었습니다.");
        }

        if (JapaneseUtils.endsWithN(userInput)) {
            return loseAndFinishGame(game, GAME_OVER, userInput, "패배! 'ん'으로 끝나는 단어를 썼습니다.");
        }

        Word userWord = wordFinder.findOrThrow(userInput);
        validateUserMove(game, userWord);

        saveTurn(game, SPEAKER_USER, userWord.getWord());
        game.applyCorrectAnswer(userWord.getLevel());

        if (userWord.endsWithN()) {
            return loseAndFinishGame(game, GAME_OVER, userWord.getWord(), "패배! 'ん'으로 끝나는 단어를 썼습니다.");
        }

        return processAiTurn(game, userWord);
    }

    public TurnResponse passTurn(Long gameId) {
        Game game = findGameOrThrow(gameId);
        validateGameIsPlaying(game);
        validateHasPassCount(game);

        game.decreasePassCount();

        Word lastWord = getLastWord(game);
        Word nextWord = findNextAiWordOrThrow(game, lastWord);

        saveTurn(game, SPEAKER_AI, nextWord.getWord());
        game.updateLastTurnTime();

        return TurnResponse.ofPass(game, nextWord);
    }

    public void quitGame(Long gameId) {
        Game game = findGameOrThrow(gameId);

        if (game.getStatus() == PLAYING) {
            game.finish(GAME_OVER);
        }
    }

    private Profile findProfileOrThrow(UUID userId) {
        return profileRepository.findById(userId)
                .orElseThrow(UserNotFound::new);
    }

    private Game findGameOrThrow(Long gameId) {
        return gameRepository.findById(gameId)
                .orElseThrow(GameNotFound::new);
    }

    private Game createAndSaveGame(Profile profile, JlptLevel level) {
        Game game = Game.create(profile, level);
        return gameRepository.save(game);
    }

    private void validateGameIsPlaying(Game game) {
        if (game.getStatus() != PLAYING) {
            throw new GameAlreadyException();
        }
    }

    private void validateLevel(JlptLevel level) {
        if (level == null) {
            throw new GameLevelException();
        }
    }

    private void validateHasPassCount(Game game) {
        if (game.getPassCount() <= 0) {
            throw new GameException("PASS 기회를 모두 소진했습니다!");
        }
    }

    private Word findStartWord(JlptLevel level) {
        return wordRepository.findRandomStartWord(level.name())
                .orElseThrow(() -> new WordException("시작 단어를 찾을 수 없습니다."));
    }

    private Word getLastWord(Game game) {
        String lastWordText = gameTurnRepository.findFirstByGameOrderByCreatedAtDesc(game)
                .map(GameTurn::getWordText)
                .orElseThrow(() -> new WordException("이전 단어 정보를 찾을 수 없습니다."));

        return wordFinder.findOrThrow(lastWordText);
    }

    private Optional<Word> findNextAiWord(Game game, Word word) {
        String startChar = word.getEffectiveEndChar();

        return wordRepository.findAiWord(
                game.getId(),
                JapaneseUtils.toHiragana(startChar),
                JapaneseUtils.toKatakana(startChar),
                game.getLevel().name()
        );
    }

    private Word findNextAiWordOrThrow(Game game, Word lastWord) {
        return findNextAiWord(game, lastWord)
                .orElseThrow(() -> new WordException("AI도 이을 단어를 못 찾았습니다. (무승부?)"));
    }

    private boolean isTimeOver(Game game, String input) {
        return SIGNAL_TIME_OVER.equals(input) || game.isTimeOut(TIME_LIMIT_SECONDS);
    }

    private void validateUserMove(Game game, Word userWord) {
        Word lastWord = getLastWord(game);
        shiritoriValidator.validateConnection(lastWord, userWord);
        validateNotDuplicateWord(game, userWord);
    }

    private void validateNotDuplicateWord(Game game, Word word) {
        if (gameTurnRepository.existsByGameAndWordText(game, word.getWord())) {
            throw new DuplicateWordException("이미 사용된 단어 입니다!");
        }
    }

    private TurnResponse processAiTurn(Game game, Word userWord) {
        Optional<Word> aiWordOptional = findNextAiWord(game, userWord);

        if (aiWordOptional.isEmpty()) {
            return winAndFinishGame(game, userWord);
        }

        Word aiWord = aiWordOptional.get();
        saveTurn(game, SPEAKER_AI, aiWord.getWord());
        game.updateLastTurnTime();

        return TurnResponse.ofSuccess(game, userWord, aiWord);
    }

    private TurnResponse winAndFinishGame(Game game, Word userWord) {
        game.finish(WIN);
        return TurnResponse.ofUserWin(game, userWord);
    }

    private TurnResponse loseAndFinishGame(Game game, GameStatus status, String word, String message) {
        game.finish(status);
        return TurnResponse.ofUserLose(game, word, message);
    }

    private void saveTurn(Game game, String speaker, String wordText) {
        int nextTurnNum = calculateNextTurnNumber(game);
        GameTurn gameTurn = GameTurn.of(game, nextTurnNum, speaker, wordText);
        gameTurnRepository.save(gameTurn);
    }

    private int calculateNextTurnNumber(Game game) {
        return (int) gameTurnRepository.countByGame(game) + 1;
    }

}
