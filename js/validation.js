export const LIMITS = Object.freeze({nickname:30,title:100,body:5000,reply:2000});
export const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
export function validateFields(data, categories, reply = false) {
  const keys = reply ? ['nickname','body'] : ['nickname','title','body','categoryId'];
  if (!data || Object.keys(data).length !== keys.length || keys.some(k => !Object.hasOwn(data,k))) throw new Error('入力項目が正しくありません。');
  for (const key of keys.filter(k => k !== 'categoryId')) {
    const max = key === 'body' && reply ? LIMITS.reply : LIMITS[key];
    if (typeof data[key] !== 'string' || !data[key].trim() || data[key].length > max) throw new Error(`${key === 'nickname' ? 'ニックネーム' : key === 'title' ? 'タイトル' : '本文'}は1〜${max}文字で入力してください。`);
  }
  if (!reply && (!validId(data.categoryId) || !categories.some(c => c.id === data.categoryId))) throw new Error('カテゴリーを選択してください。');
  return data;
}
export function configReady(config) {
  return config.projectId === 'ichimizu-bbs' && ['apiKey','authDomain','appId'].every(k => typeof config[k] === 'string' && config[k].trim().length > 0);
}
