package hello.shiritori.global.init;

import com.opencsv.bean.CsvToBean;
import com.opencsv.bean.CsvToBeanBuilder;
import hello.shiritori.dto.WordCsvDto;
import hello.shiritori.entity.JlptLevel;
import hello.shiritori.entity.Word;
import hello.shiritori.repository.WordRepository;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
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
        ClassPathResource resource = new ClassPathResource("data/jlpt_words2.csv");
        
        try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
            CsvToBean<WordCsvDto> csvToBean = new CsvToBeanBuilder<WordCsvDto>(reader)
                    .withType(WordCsvDto.class)
                    .withIgnoreLeadingWhiteSpace(true)
                    .build();

            List<WordCsvDto> csvRows = csvToBean.parse();
            List<Word> allEntities = new ArrayList<>();

            for (WordCsvDto row : csvRows) {
                if (row.getReading() == null || row.getReading().isBlank()) {
                    continue;
                }
                 allEntities.add(mapToEntity(row));
            }

            int batchSize = 500;
            int totalSize = allEntities.size();
            
            for (int i = 0; i < totalSize; i += batchSize) {
                int end = Math.min(i + batchSize, totalSize);
                List<Word> batchList = allEntities.subList(i, end);
                
                wordRepository.saveAll(batchList);
                wordRepository.flush();
                
                log.info("데이터 저장 진행 중: {} / {}", end, totalSize);
            }
            // --------------------------------------
            
            log.info("총 {}개의 단어 저장 완료!", totalSize);
        }
    }
    
    private Word mapToEntity(WordCsvDto dto) {
        String reading = dto.getReading();

        return Word.builder()
                .word(dto.getWord())
                .reading(reading)
                .meaning(dto.getMeaning())
                .level(JlptLevel.valueOf(dto.getLevel()))
                .build();
    }
}