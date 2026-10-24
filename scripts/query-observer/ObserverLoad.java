/** Verify all three actual pinned classes before spending a browser run. */
public class ObserverLoad {
  public static void main(String[] args) throws Exception {
    for (String name : new String[]{"firestore.CloudFirestoreV1", "watch.ListenStreamManager", "rules.DefaultEmulatorRulesAuthorizer"})
      Class.forName("com.google.cloud.datastore.emulator.impl." + name);
    long count = QueryObserver.rows.stream().filter(s -> s.contains("\"status\":\"instrumented\"")).count();
    if (count != 5) throw new AssertionError("Expected five actual transformed methods: " + count);
    if (QueryObserver.rows.stream().anyMatch(s -> s.contains("unavailable"))) throw new AssertionError("Instrumentation unavailable");
    System.out.println("PASS: five pinned-emulator methods load with JVM verification");
  }
}
