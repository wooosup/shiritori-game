package hello.shiritori.domain.profile.policy;

import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.nickname")
public class NicknamePolicyProperties {

    private List<String> profanityKeywords = new ArrayList<>();

    private List<String> sexualKeywords = new ArrayList<>();
}
