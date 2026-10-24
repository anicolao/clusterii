import java.util.concurrent.locks.LockSupport;
class ProfileExportLoad {
 static volatile boolean running=true;
 static void waitLayer(int depth) { if(depth>0)waitLayer(depth-1); else LockSupport.parkNanos(20000000L); }
 public static void main(String[] args) throws Exception {
  Thread[] workers=new Thread[16];
  for(int i=0;i<workers.length;i++){workers[i]=new Thread(()->{while(running)waitLayer(16);});workers[i].start();}
  System.out.println("ready");Thread.sleep(60000);running=false;for(Thread t:workers)t.join();
 }
}