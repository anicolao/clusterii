import java.lang.instrument.*;
import java.security.ProtectionDomain;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.io.*;
import jdk.internal.org.objectweb.asm.*;

/** Opt-in diagnostic for the pinned local Firestore emulator. Never a production dependency. */
public final class QueryObserver {
  static final String BASE = "com/google/cloud/datastore/emulator/impl/";
  static final AtomicLong sequence = new AtomicLong();
  static final ThreadLocal<Long> commit = ThreadLocal.withInitial(() -> 0L);
  static final List<String> rows = Collections.synchronizedList(new ArrayList<>());
  static volatile Path output;
  static final class Span {
    final long start = System.nanoTime(), wall = System.currentTimeMillis();
    final long previous = commit.get();
    final String phase; final long seq; final int queries, streams;
    Span(String phase, Object receiver) throws Exception {
      this.phase = phase;
      seq = phase.equals("commit") ? sequence.incrementAndGet() : previous;
      if (phase.equals("commit")) commit.set(seq);
      queries = phase.equals("notify") ? count(receiver, "streamTargetToQueries") : -1;
      streams = phase.equals("notify") ? count(receiver, "streamIdToStream") : -1;
    }
  }
  static int count(Object receiver, String name) throws Exception {
    var field = receiver.getClass().getDeclaredField(name);
    field.setAccessible(true);
    return ((Map<?, ?>)field.get(receiver)).size();
  }
  public static Object begin(String phase, Object receiver) {
    try { return new Span(phase, receiver); }
    catch (Throwable ignored) { record("{\"status\":\"unavailable\",\"reason\":\"count\"}"); return null; }
  }
  public static void end(Object value, boolean failed) {
    if (!(value instanceof Span s)) return;
    try {
      long elapsed = System.nanoTime() - s.start;
      record("{\"phase\":\"" + s.phase + "\",\"sequence\":" + s.seq +
        ",\"startEpochMs\":" + s.wall + ",\"elapsedNs\":" + elapsed +
        ",\"queries\":" + s.queries + ",\"streams\":" + s.streams +
        ",\"failed\":" + failed + "}");
    } catch (Throwable ignored) { /* diagnostics never replace service outcomes */ }
    finally { if (s.phase.equals("commit")) commit.set(s.previous); }
  }
  static void record(String row) {
    synchronized (rows) { if (rows.size() < 50000) rows.add(row); }
  }
  public static void premain(String args, Instrumentation instrumentation) throws Exception {
    if (!"demo-clusterii".equals(System.getenv("CLUSTER_QUERY_OBSERVER_PROJECT"))) return;
    if (!System.getProperty("sun.java.command", "").contains("cloud-firestore-emulator-v1.22.0.jar") &&
        !System.getProperty("sun.java.command", "").equals("ObserverLoad")) return;
    output = Path.of(args);
    if (Files.exists(output)) throw new IllegalStateException("Existing diagnostic output");
    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
      try { synchronized(rows) { Files.write(output, rows); } }
      catch (IOException ignored) { System.err.println("QUERY_OBSERVER unavailable:write"); }
    }));
    instrumentation.addTransformer(new ClassFileTransformer() {
      public byte[] transform(ClassLoader loader, String name, Class<?> c, ProtectionDomain domain, byte[] bytes) {
        if (!(name.equals(BASE + "firestore/CloudFirestoreV1") ||
              name.equals(BASE + "watch/ListenStreamManager") ||
              name.equals(BASE + "rules/DefaultEmulatorRulesAuthorizer"))) return null;
        try {
          String actual = HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
            .digest(Files.readAllBytes(Path.of(domain.getCodeSource().getLocation().toURI()))));
          if (!actual.equals("9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c")) {
            record("{\"status\":\"unavailable\",\"reason\":\"jar\"}"); return null;
          }
          return instrument(name, bytes);
        } catch (Throwable ignored) {
          record("{\"status\":\"unavailable\",\"reason\":\"transform\"}"); return null;
        }
      }
    });
    record("{\"status\":\"active\",\"schema\":1,\"limit\":50000}");
  }
  static byte[] instrument(String owner, byte[] bytes) {
    var reader = new ClassReader(bytes);
    var writer = new ClassWriter(reader, ClassWriter.COMPUTE_MAXS);
    reader.accept(new ClassVisitor(Opcodes.ASM8, writer) {
      public MethodVisitor visitMethod(int access, String name, String descriptor, String signature, String[] exceptions) {
        String phase = null;
        if (owner.endsWith("/CloudFirestoreV1") && name.equals("commit")) phase = "commit";
        if (owner.endsWith("/CloudFirestoreV1") && name.equals("snapshotQuery")) phase = "query";
        if (owner.endsWith("/ListenStreamManager") && name.equals("notifyListeners")) phase = "notify";
        if (owner.endsWith("/DefaultEmulatorRulesAuthorizer") && (name.equals("checkQuery") || name.equals("checkLookup"))) phase = "rules";
        if (phase == null) return super.visitMethod(access, name, descriptor, signature, exceptions);
        wrapper(writer, owner, access, name, descriptor, signature, exceptions, phase);
        record("{\"status\":\"instrumented\",\"phase\":\"" + phase + "\"}");
        return super.visitMethod(access & ~Opcodes.ACC_SYNCHRONIZED, "clusterObserved$" + name, descriptor, signature, exceptions);
      }
    }, 0);
    return writer.toByteArray();
  }
  static void wrapper(ClassWriter writer, String owner, int access, String name, String descriptor,
                      String signature, String[] exceptions, String phase) {
    var m = writer.visitMethod(access, name, descriptor, signature, exceptions);
    m.visitCode();
    var args = Type.getArgumentTypes(descriptor); var result = Type.getReturnType(descriptor);
    int slot = 1; List<Object> locals = new ArrayList<>(); locals.add(owner);
    for (var t : args) { slot += t.getSize(); locals.add(t.getInternalName()); }
    int token = slot;
    m.visitLdcInsn(phase); m.visitVarInsn(Opcodes.ALOAD, 0);
    m.visitMethodInsn(Opcodes.INVOKESTATIC, "QueryObserver", "begin", "(Ljava/lang/String;Ljava/lang/Object;)Ljava/lang/Object;", false);
    m.visitVarInsn(Opcodes.ASTORE, token); locals.add("java/lang/Object");
    Label begin = new Label(), end = new Label(), handler = new Label();
    m.visitTryCatchBlock(begin, end, handler, "java/lang/Throwable"); m.visitLabel(begin);
    m.visitVarInsn(Opcodes.ALOAD, 0); slot = 1;
    for (var t : args) { m.visitVarInsn(t.getOpcode(Opcodes.ILOAD), slot); slot += t.getSize(); }
    m.visitMethodInsn(Opcodes.INVOKESPECIAL, owner, "clusterObserved$" + name, descriptor, false);
    if (result.getSort() != Type.VOID) m.visitVarInsn(result.getOpcode(Opcodes.ISTORE), token + 1);
    m.visitLabel(end);
    m.visitVarInsn(Opcodes.ALOAD, token); m.visitInsn(Opcodes.ICONST_0);
    m.visitMethodInsn(Opcodes.INVOKESTATIC, "QueryObserver", "end", "(Ljava/lang/Object;Z)V", false);
    if (result.getSort() != Type.VOID) m.visitVarInsn(result.getOpcode(Opcodes.ILOAD), token + 1);
    m.visitInsn(result.getOpcode(Opcodes.IRETURN));
    m.visitLabel(handler);
    m.visitFrame(Opcodes.F_FULL, locals.size(), locals.toArray(), 1, new Object[]{"java/lang/Throwable"});
    m.visitVarInsn(Opcodes.ASTORE, token + 1);
    m.visitVarInsn(Opcodes.ALOAD, token); m.visitInsn(Opcodes.ICONST_1);
    m.visitMethodInsn(Opcodes.INVOKESTATIC, "QueryObserver", "end", "(Ljava/lang/Object;Z)V", false);
    m.visitVarInsn(Opcodes.ALOAD, token + 1); m.visitInsn(Opcodes.ATHROW);
    m.visitMaxs(0, 0); m.visitEnd();
  }
}
