package fixture;
public class CloudFirestoreV1 {
  public Object commit(Object value, Object listener) throws Exception {
    listener.getClass().getMethod("notifyListeners", Object.class).invoke(listener, value);
    return snapshotQuery(value);
  }
  public Object snapshotQuery(Object value) throws Exception {
    if (value instanceof Exception e) throw e;
    return value;
  }
}
