import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { updateSettings } from '../store/slices/userSlice';
import { db } from '../db/db';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.user);

  if (!user.profile) return null;

  const handleToggle = async (key: keyof typeof user.profile.settings) => {
    if (!user.profile) return;
    const newValue = !user.profile.settings[key];
    
    // Update State
    dispatch(updateSettings({ [key]: newValue }));
    
    // Update DB
    await db.userProfile.update(user.profile.id, {
      settings: { ...user.profile.settings, [key]: newValue }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <h2>設定</h2>
        
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">空間マッピング</span>
            <span className="setting-desc">数字ごとに表示位置を固定します</span>
          </div>
          <button 
            className={`toggle-switch ${user.profile.settings.spatial_mapping ? 'on' : 'off'}`}
            onClick={() => handleToggle('spatial_mapping')}
          >
            {user.profile.settings.spatial_mapping ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">音声読み上げ</span>
            <span className="setting-desc">数字の表示時に音声を再生します</span>
          </div>
          <button 
            className={`toggle-switch ${user.profile.settings.voice_assist ? 'on' : 'off'}`}
            onClick={() => handleToggle('voice_assist')}
          >
            {user.profile.settings.voice_assist ? 'ON' : 'OFF'}
          </button>
        </div>

        <button className="close-button" onClick={onClose}>
          閉じる
        </button>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex; justify-content: center; align-items: center;
          z-index: 1000;
        }
        .settings-modal {
          background: rgba(30, 41, 59, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 2.5rem;
          width: 90%; max-width: 400px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .settings-modal h2 { margin-top: 0; color: #4facfe; }
        .setting-item {
          display: flex; justify-content: space-between; align-items: center;
          margin: 1.5rem 0; padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .setting-info { display: flex; flex-direction: column; text-align: left; }
        .setting-label { font-weight: 600; font-size: 1.1rem; }
        .setting-desc { font-size: 0.85rem; color: #94a3b8; margin-top: 0.2rem; }
        .toggle-switch {
          min-width: 80px; padding: 0.5rem 1rem; border-radius: 999px;
          font-weight: bold; border: none; cursor: pointer; transition: all 0.2s;
        }
        .toggle-switch.on { background: #4facfe; color: white; }
        .toggle-switch.off { background: rgba(255, 255, 255, 0.1); color: #94a3b8; }
        .close-button {
          width: 100%; margin-top: 1rem; background: rgba(255, 255, 255, 0.05);
          color: white; border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem; border-radius: 12px; cursor: pointer;
        }
        .close-button:hover { background: rgba(255, 255, 255, 0.1); }
      `}</style>
    </div>
  );
};

export default SettingsModal;
