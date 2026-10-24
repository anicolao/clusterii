package fixture;
import java.util.*;
public class ListenStreamManager {
  private final Map<Integer, Integer> streamTargetToQueries = Map.of(1,1,2,2);
  private final Map<Integer, Integer> streamIdToStream = Map.of(1,1);
  public synchronized void notifyListeners(Object value) { }
}
