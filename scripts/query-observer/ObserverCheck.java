import java.nio.file.*;
public class ObserverCheck {
  public static void main(String[] args) throws Exception {
    var loader = new ClassLoader(ObserverCheck.class.getClassLoader()) {
      protected Class<?> findClass(String name) throws ClassNotFoundException {
        try {
          byte[] bytes = Files.readAllBytes(Path.of(args[0], name.replace('.', '/') + ".class"));
          byte[] changed = QueryObserver.instrument(name.replace('.', '/'), bytes);
          return defineClass(name, changed, 0, changed.length);
        } catch (Exception e) { throw new ClassNotFoundException(name, e); }
      }
    };
    Object cloud = loader.loadClass("fixture.CloudFirestoreV1").getConstructor().newInstance();
    Object listener = loader.loadClass("fixture.ListenStreamManager").getConstructor().newInstance();
    var call = cloud.getClass().getMethod("commit", Object.class, Object.class);
    if (!java.lang.reflect.Modifier.isSynchronized(listener.getClass().getMethod("notifyListeners", Object.class).getModifiers())) throw new AssertionError("synchronization removed");
    Object value = new Object();
    if (call.invoke(cloud, value, listener) != value) throw new AssertionError("return identity");
    Exception original = new Exception("never logged");
    try { call.invoke(cloud, original, listener); throw new AssertionError("missing exception"); }
    catch (java.lang.reflect.InvocationTargetException e) {
      if (e.getCause() != original) throw new AssertionError("exception identity");
    }
    if (QueryObserver.commit.get() != 0) throw new AssertionError("context leaked");
    if (QueryObserver.rows.stream().noneMatch(s -> s.contains("\"queries\":2,\"streams\":1"))) throw new AssertionError("counts");
    if (QueryObserver.rows.stream().filter(s -> s.contains("\"sequence\":2") && s.contains("\"failed\":true")).count() != 2) throw new AssertionError("failure correlation");
    System.out.println("PASS: original return/throw identity, synchronized wrapper, counts, sequence, context retirement");
  }
}
