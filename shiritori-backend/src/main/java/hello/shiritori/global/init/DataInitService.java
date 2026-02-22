package hello.shiritori.global.init;

import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import hello.shiritori.domain.word.dto.WordCsvDto;
import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.word.repository.WordRepository;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.data-init.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class DataInitService implements CommandLineRunner {

    private final WordRepository wordRepository;
    @Value("${app.data-init.upsert:false}")
    private boolean upsertMode;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (!upsertMode && wordRepository.count() > 0) {
            log.info("이미 데이터가 존재합니다. 건너뜁니다. (app.data-init.upsert=false)");
            return;
        }

        log.info("CSV 데이터 로딩 시작..");

        Map<String, Word> existingWordMap = loadExistingWordMap();
        log.info("현재 DB에 존재하는 단어 수: {}개", existingWordMap.size());
        ClassPathResource resource = new ClassPathResource("data/output.csv");

        try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
            CsvToBean<WordCsvDto> csvToBean = new CsvToBeanBuilder<WordCsvDto>(reader)
                    .withType(WordCsvDto.class)
                    .withIgnoreLeadingWhiteSpace(true)
                    .build();

            List<WordCsvDto> csvRows = csvToBean.parse();
            List<Word> newEntities = new ArrayList<>();
            int inserted = 0;
            int updated = 0;

            for (WordCsvDto row : csvRows) {
                String targetWord = row.getWord() == null ? null : row.getWord().trim();
                String targetReading = row.getReading() == null ? null : row.getReading().trim();
                String targetMeaning = row.getMeaning();
                JlptLevel targetLevel = parseLevel(row.getLevel());

                if (targetWord == null || targetWord.isBlank()
                        || targetReading == null || targetReading.isBlank()) {
                    continue;
                }

                if (existingWordMap.containsKey(targetWord)) {
                    Word existingWord = existingWordMap.get(targetWord);
                    existingWord.updateFromImport(
                            targetLevel,
                            targetReading,
                            targetMeaning
                    );
                    updated++;
                    continue;
                }

                Word newWord = mapToEntity(targetWord, targetReading, targetMeaning, targetLevel);
                newEntities.add(newWord);
                existingWordMap.put(targetWord, newWord);
                inserted++;
            }

            if (newEntities.isEmpty()) {
                log.info("추가할 새로운 단어가 없습니다. (업데이트: {}개)", updated);
                return;
            }

            int batchSize = 500;
            int totalSize = newEntities.size();

            for (int i = 0; i < totalSize; i += batchSize) {
                int end = Math.min(i + batchSize, totalSize);
                List<Word> batchList = newEntities.subList(i, end);

                wordRepository.saveAll(batchList);
                wordRepository.flush();

                log.info("데이터 저장 진행 중: {} / {}", end, totalSize);
            }

            log.info("CSV 처리 완료 - 신규 저장: {}개, 업데이트: {}개, 신규 인식: {}개", totalSize, updated, inserted);
        }
    }

    private Map<String, Word> loadExistingWordMap() {
        List<Word> words = wordRepository.findAll();
        Map<String, Word> map = new HashMap<>(Math.max(words.size() * 2, 16));
        for (Word word : words) {
            map.putIfAbsent(word.getWord(), word);
        }
        return map;
    }

    private Word mapToEntity(String word, String reading, String meaning, JlptLevel level) {
        return Word.builder()
                .word(word)
                .reading(reading)
                .meaning(meaning)
                .level(level)
                .build();
    }

    private JlptLevel parseLevel(String rawLevel) {
        if (rawLevel == null || rawLevel.isBlank()) {
            return null;
        }

        try {
            return JlptLevel.valueOf(rawLevel.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            log.warn("유효하지 않은 JLPT 레벨입니다. null로 저장합니다. level={}", rawLevel);
            return null;
        }
    }
}
