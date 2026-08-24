"use client";

import type { ChangeEvent } from "react";

type ProfileTransferCardProps = {
  hasProfile: boolean;
  password: string;
  pendingFileName?: string;
  onPasswordChange: (password: string) => void;
  onExport: () => void;
  onSelectFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
};

export default function ProfileTransferCard({
  hasProfile,
  password,
  pendingFileName,
  onPasswordChange,
  onExport,
  onSelectFile,
  onImport,
}: ProfileTransferCardProps) {
  return (
    <details className="surface-card transfer-card">
      <summary>
        <div>
          <span className="section-kicker">档案工具</span>
          <h2>跨设备迁移</h2>
          <p>加密导出或导入你的玄鉴档案</p>
        </div>
        <span className="transfer-summary-action">展开 <i aria-hidden="true">⌄</i></span>
      </summary>
      <div className="transfer-panel">
        <p>使用 AES-GCM 加密保护档案。密码只用于本次操作，不会保存；遗忘后无法找回。</p>
        <label className="field">
          <span>档案密码 <small>至少6位</small></span>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={pendingFileName ? "输入所选档案的密码" : "输入导出密码，或先选择档案"}
            autoComplete="off"
          />
        </label>
        <div className="transfer-actions">
          <button type="button" onClick={onExport} disabled={!hasProfile || password.length < 6}>加密导出 .xjprofile</button>
          <label>选择档案<input type="file" accept=".xjprofile,application/json" onChange={onSelectFile} /></label>
          <button type="button" onClick={onImport} disabled={!pendingFileName || password.length < 6}>解密并导入</button>
        </div>
        {pendingFileName ? <small className="import-file-status" role="status">已选择：{pendingFileName}</small> : null}
        <small className="transfer-help">{hasProfile ? "导出需先输入密码；导入可先选择档案，再输入密码解密。" : "完成首次开签后可导出；已有档案可先选择文件，再输入密码导入。"}</small>
      </div>
    </details>
  );
}
