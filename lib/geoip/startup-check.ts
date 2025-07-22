import {
  databaseDownloader,
  DatabaseStatus,
  DownloadProgress,
} from "./downloader";

// 启动检测状态
export interface StartupCheckStatus {
  isChecking: boolean;
  isDownloading: boolean;
  databases: DatabaseStatus[];
  downloadProgress: DownloadProgress[];
  error: string | null;
  isReady: boolean;
}

// 启动检测事件类型
export type StartupCheckEvent =
  | { type: "checking_start" }
  | { type: "checking_complete"; databases: DatabaseStatus[] }
  | { type: "download_start" }
  | { type: "download_progress"; progress: DownloadProgress[] }
  | { type: "download_complete" }
  | { type: "error"; error: string }
  | { type: "ready" };

// 事件监听器类型
export type StartupCheckEventListener = (event: StartupCheckEvent) => void;

/**
 * 启动检测服务
 * 负责应用启动时的数据库检测和自动下载
 */
export class StartupCheckService {
  private status: StartupCheckStatus = {
    isChecking: false,
    isDownloading: false,
    databases: [],
    downloadProgress: [],
    error: null,
    isReady: false,
  };

  private eventListeners: StartupCheckEventListener[] = [];
  private _isInitialized = false;

  /**
   * 添加事件监听器
   */
  addEventListener(listener: StartupCheckEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: StartupCheckEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: StartupCheckEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  /**
   * 更新状态
   */
  private updateStatus(updates: Partial<StartupCheckStatus>): void {
    this.status = { ...this.status, ...updates };
  }

  /**
   * 获取当前状态
   */
  getStatus(): StartupCheckStatus {
    return { ...this.status };
  }

  /**
   * 执行启动检测
   */
  async performStartupCheck(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    try {
      // 静默检查数据库状态
      const databases = await databaseDownloader.checkDatabases();
      this.updateStatus({ databases });

      // 检查是否需要下载
      const missingDatabases = databases.filter(
        (db) => !db.exists || !db.isValid
      );

      if (missingDatabases.length === 0) {
        // 所有数据库都已存在且有效
        this.updateStatus({
          isChecking: false,
          isReady: true,
        });
        this._isInitialized = true;
        return;
      }

      // 静默下载缺失的数据库
      this.updateStatus({
        isChecking: false,
        isDownloading: true,
      });

      // 下载缺失的数据库（不显示进度）
      await databaseDownloader.downloadMissingDatabases();

      // 重新检查数据库状态
      const finalDatabases = await databaseDownloader.checkDatabases();
      this.updateStatus({
        databases: finalDatabases,
        isDownloading: false,
        isReady: true,
      });

      this._isInitialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";

      this.updateStatus({
        isChecking: false,
        isDownloading: false,
        error: errorMessage,
      });

      console.error("数据库初始化失败:", errorMessage);

      // 不抛出错误，让应用继续运行
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * 检查是否已准备就绪
   */
  isReady(): boolean {
    return this.status.isReady;
  }

  /**
   * 获取数据库状态
   */
  getDatabaseStatus(): DatabaseStatus[] {
    return this.status.databases;
  }

  /**
   * 获取下载进度
   */
  getDownloadProgress(): DownloadProgress[] {
    return this.status.downloadProgress;
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.status = {
      isChecking: false,
      isDownloading: false,
      databases: [],
      downloadProgress: [],
      error: null,
      isReady: false,
    };
    this._isInitialized = false;
  }

  /**
   * 手动触发数据库检查
   */
  async checkDatabases(): Promise<DatabaseStatus[]> {
    const databases = await databaseDownloader.checkDatabases();
    this.updateStatus({ databases });
    return databases;
  }

  /**
   * 手动触发数据库下载
   */
  async downloadDatabases(): Promise<void> {
    if (this.status.isDownloading) {
      throw new Error("下载已在进行中");
    }

    this.updateStatus({ isDownloading: true, error: null });
    this.emitEvent({ type: "download_start" });

    try {
      await databaseDownloader.downloadMissingDatabases();

      const databases = await databaseDownloader.checkDatabases();
      this.updateStatus({
        databases,
        isDownloading: false,
      });

      this.emitEvent({ type: "download_complete" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.updateStatus({
        isDownloading: false,
        error: errorMessage,
      });
      this.emitEvent({ type: "error", error: errorMessage });
      throw error;
    }
  }
}

// 全局启动检测服务实例
export const startupCheckService = new StartupCheckService();
