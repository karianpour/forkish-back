import { HttpServer } from './services/http-server';
import { DataService } from './services/data-service';
import { Model, QueryBuilder, NotificationListener } from './services/interfaces';
import * as Debug from 'debug';
let debug = Debug('4kish-server');

export class Server {
  private dataService: DataService;
  private httpServer: HttpServer;

  async run(
    host: string = '0.0.0.0',
    port: number = 8050,
    logger: boolean = true,
    origin: boolean = true,
  ){
    debug('starting services');
    this.dataService = new DataService();
    await this.dataService.connect();

    this.httpServer = new HttpServer(this.dataService, host, port, logger, origin);
    this.httpServer.start();
  }

  getDataService(): DataService{
    return this.dataService;
  }

  getHttpServer(): HttpServer{
    return this.httpServer;
  }

  registerQueryBuilder(queryBuilders: QueryBuilder[]): void{
    this.dataService.registerQueryBuilder(queryBuilders);
  }

  registerModel(models: Model[]): void{
    this.httpServer.registerModelRoutes(models);
    this.dataService.registerModelActions(models);
    models.forEach( model => model.setServer(this));
  }

  registerNotification(notificationListeners: NotificationListener[]) {
    notificationListeners.forEach( notificationListener => {
      this.dataService.registerNotificationListener(notificationListener);
      notificationListener.setServer(this);
    });
  }

  async stop() {
    debug('stopping services');
    await this.httpServer.stop();
    await this.dataService.stop();
  }

}
