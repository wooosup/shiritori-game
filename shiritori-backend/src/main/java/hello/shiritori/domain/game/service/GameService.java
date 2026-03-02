package hello.shiritori.domain.game.service;

import static hello.shiritori.domain.game.entity.GameStatus.GAME_OVER;
import static hello.shiritori.domain.game.entity.GameStatus.PLAYING;
import static hello.shiritori.domain.game.entity.GameStatus.TIME_OVER;
import static hello.shiritori.domain.game.entity.GameStatus.WIN;

import hello.shiritori.domain.gameTurn.dto.TurnRequest;
import hello.shiritori.domain.gameTurn.dto.TurnResponse;
import hello.shiritori.domain.gameTurn.service.GameTurnService;
import hello.shiritori.domain.game.dto.GameStartRequest;
import hello.shiritori.domain.game.dto.GameStartResponse;
import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.game.entity.GameStatus;
import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.game.repository.GameRepository;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.ranking.service.RankingService;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.word.repository.WordRepository;
import hello.shiritori.global.exception.DuplicateWordException;
import hello.shiritori.global.exception.GameAccessDeniedException;
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
    private static final String SPEAKER_AI = "AI";
    private static final String SPEAKER_USER = "USER";

    private final GameRepository gameRepository;
    private final GameTurnService gameTurnService;
    private final WordRepository wordRepository;
    private final ProfileRepository profileRepository;
    private final RankingService rankingService;
    private final WordFinder wordFinder;
    private final ShiritoriValidator shiritoriValidator;

    public GameStartResponse start(UUID userId, GameStartRequest request) {
        Profile profile = findProfileOrThrow(userId);
        validateLevel(request.getLevel());

        Game game = createAndSaveGame(profile, request.getLevel());
        Word startWord = findStartWord(game.getLevel());

        gameTurnService.save(game, SPEAKER_AI, startWord.getWord());

        return GameStartResponse.of(
                game.getId(),
                startWord.getWord(),
                startWord.getReading(),
                startWord.getMeaning()
        );
    }

    public TurnResponse playTurn(UUID userId, Long gameId, TurnRequest request) {
        Game game = findGameForUserForUpdateOrThrow(userId, gameId);
        validateGameIsPlaying(game);

        String userInput = request.getWord().trim();

        if (isTimeOver(game)) {
            return loseAndFinishGame(game, TIME_OVER, userInput, "시간 초과! 게임이 종료되었습니다.");
        }

        if (JapaneseUtils.endsWithN(userInput)) {
            return loseAndFinishGame(game, GAME_OVER, userInput, "패배! 'ん'으로 끝나는 단어를 썼습니다.");
        }

        Word userWord = wordFinder.findOrThrow(userInput);
        validateUserMove(game, userWord);

        gameTurnService.save(game, SPEAKER_USER, userWord.getWord());
        game.applyCorrectAnswer(userWord.getLevel());

        if (userWord.endsWithN()) {
            return loseAndFinishGame(game, GAME_OVER, userWord.getWord(), "패배! 'ん'으로 끝나는 단어를 썼습니다.");
        }

        return processAiTurn(game, userWord);
    }

    public TurnResponse passTurn(UUID userId, Long gameId) {
        Game game = findGameForUserForUpdateOrThrow(userId, gameId);
        validateGameIsPlaying(game);
        validateHasPassCount(game);

        game.decreasePassCount();

        Word lastWord = gameTurnService.getLastWordOrThrow(game);
        Word nextWord = findNextAiWordOrThrow(game, lastWord);

        gameTurnService.save(game, SPEAKER_AI, nextWord.getWord());
        game.updateLastTurnTime();

        return TurnResponse.ofPass(game, nextWord);
    }

    public void quitGame(UUID userId, Long gameId) {
        Game game = findGameForUserForUpdateOrThrow(userId, gameId);

        if (game.getStatus() == PLAYING) {
            finishAndRefreshRanking(game, GAME_OVER);
        }
    }

    public TurnResponse timeoutGame(UUID userId, Long gameId) {
        Game game = findGameForUserForUpdateOrThrow(userId, gameId);
        validateGameIsPlaying(game);
        return loseAndFinishGame(game, TIME_OVER, null, "시간 초과! 게임이 종료되었습니다.");
    }

    private Profile findProfileOrThrow(UUID userId) {
        return profileRepository.findById(userId)
                .orElseThrow(UserNotFound::new);
    }

    private Game findGameOrThrow(Long gameId) {
        return gameRepository.findById(gameId)
                .orElseThrow(GameNotFound::new);
    }

    private Game findGameForUpdateOrThrow(Long gameId) {
        return gameRepository.findByIdForUpdate(gameId)
                .orElseThrow(GameNotFound::new);
    }

    private Game findGameForUserForUpdateOrThrow(UUID userId, Long gameId) {
        Game game = findGameForUpdateOrThrow(gameId);
        if (game.getUser() == null || !game.getUser().getId().equals(userId)) {
            throw new GameAccessDeniedException();
        }
        return game;
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
        return wordRepository.findRandomStartWord(toLevelFilter(level))
                .orElseThrow(() -> new WordException("시작 단어를 찾을 수 없습니다."));
    }

    private Optional<Word> findNextAiWord(Game game, Word word) {
        String startChar = word.getEffectiveEndChar();

        return wordRepository.findAiWord(
                game.getId(),
                JapaneseUtils.toHiragana(startChar),
                JapaneseUtils.toKatakana(startChar),
                toLevelFilter(game.getLevel())
        );
    }

    private String toLevelFilter(JlptLevel level) {
        if (level == null || level == JlptLevel.ALL) {
            return null;
        }
        return level.name();
    }

    private Word findNextAiWordOrThrow(Game game, Word lastWord) {
        return findNextAiWord(game, lastWord)
                .orElseThrow(() -> new WordException("AI도 이을 단어를 못 찾았습니다. (무승부?)"));
    }

    private boolean isTimeOver(Game game) {
        return game.isTimeOut(TIME_LIMIT_SECONDS);
    }

    private void validateUserMove(Game game, Word userWord) {
        Word lastWord = gameTurnService.getLastWordOrThrow(game);
        shiritoriValidator.validateConnection(lastWord, userWord);
        validateNotDuplicateWord(game, userWord);
    }

    private void validateNotDuplicateWord(Game game, Word word) {
        if (gameTurnService.isWordAlreadyUsed(game, word.getWord())) {
            throw new DuplicateWordException("이미 사용된 단어 입니다!");
        }
    }

    private TurnResponse processAiTurn(Game game, Word userWord) {
        Optional<Word> aiWordOptional = findNextAiWord(game, userWord);

        if (aiWordOptional.isEmpty()) {
            return winAndFinishGame(game, userWord);
        }

        Word aiWord = aiWordOptional.get();
        gameTurnService.save(game, SPEAKER_AI, aiWord.getWord());
        game.updateLastTurnTime();

        return TurnResponse.ofSuccess(game, userWord, aiWord);
    }

    private TurnResponse winAndFinishGame(Game game, Word userWord) {
        finishAndRefreshRanking(game, WIN);
        return TurnResponse.ofUserWin(game, userWord);
    }

    private TurnResponse loseAndFinishGame(Game game, GameStatus status, String word, String message) {
        finishAndRefreshRanking(game, status);
        return TurnResponse.ofUserLose(game, word, message);
    }

    private void finishAndRefreshRanking(Game game, GameStatus status) {
        game.finish(status);
        if (game.getStatus() != PLAYING) {
            rankingService.refreshRankingSnapshot();
        }
    }

}
