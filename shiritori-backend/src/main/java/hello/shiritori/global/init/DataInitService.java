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
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.data-init.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class DataInitService implements CommandLineRunner {

    private final WordRepository wordRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (wordRepository.count() > 0) {
            log.info("이미 데이터가 존재합니다. 건너뜁니다.");
            return;
        }

        log.info("CSV 데이터 로딩 시작..");

        Set<String> existingWords = wordRepository.findAllWordsInSet();
        log.info("현재 DB에 존재하는 단어 수: {}개", existingWords.size());
        ClassPathResource resource = new ClassPathResource("data/output.csv");

        try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
            CsvToBean<WordCsvDto> csvToBean = new CsvToBeanBuilder<WordCsvDto>(reader)
                    .withType(WordCsvDto.class)
                    .withIgnoreLeadingWhiteSpace(true)
                    .build();

            List<WordCsvDto> csvRows = csvToBean.parse();
            List<Word> newEntities = new ArrayList<>();
            int count = 0;

            for (WordCsvDto row : csvRows) {
                String targetWord = row.getWord();

                if (row.getWord() == null || row.getWord().isBlank()
                        || row.getReading() == null || row.getReading().isBlank()
                        || row.getLevel() == null || row.getLevel().isBlank()) {
                    continue;
                }

                if (existingWords.contains(targetWord)) {
                    count++;
                    continue;
                }
                newEntities.add(mapToEntity(row));
                existingWords.add(targetWord);
            }

            if (newEntities.isEmpty()) {
                log.info("추가할 새로운 단어가 없습니다. (중복 제외됨: {}개)", count);
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

            log.info("총 {}개의 단어 저장 완료!", totalSize);
        }
    }

    private Word mapToEntity(WordCsvDto dto) {
        String reading = dto.getReading();
        String level = dto.getLevel();

        return Word.builder()
                .word(dto.getWord())
                .reading(reading)
                .meaning(dto.getMeaning())
                .level(JlptLevel.valueOf(level))
                .build();
    }
}
