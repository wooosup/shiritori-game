package hello.shiritori.domain.word.dto;

import com.opencsv.bean.CsvBindByPosition;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WordCsvDto {

    @CsvBindByPosition(position = 0)
    private String word;

    @CsvBindByPosition(position = 1)
    private String reading;

    @CsvBindByPosition(position = 2)
    private String meaning;

    @CsvBindByPosition(position = 3)
    private String level;
}