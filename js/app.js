import {firebaseConfig,sharedAccountUid} from './config.js?v=20261008-config1';
import {LIMITS,validId,validateFields,configReady} from './validation.js';
import {connect} from './firebase.js';

const app = document.querySelector('#app'), status = document.querySelector('#status');
let api, user = null, categories = [], view = 0, nickname = '', sending = false;
const canWrite = () => Boolean(api && sharedAccountUid && user?.uid === sharedAccountUid);
const el = (tag,text,className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const link = (text,href,className) => {const node = el('a',text,className);node.href = href;return node;};
const categoryName = id => categories.find(c => c.id === id)?.name || 'カテゴリー未設定';
const date = timestamp => {
  try {return new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tokyo'}).format(timestamp.toDate());}
  catch {return '日時を取得できません';}
};
function message(error) {
  const code = error?.code || '';
  if (code.includes('permission-denied')) return 'アクセスが拒否されました。管理者にFirestoreルールと共通アカウントのUIDを確認してもらってください。';
  if (code.includes('failed-precondition')) return '一覧の読み込みに必要な設定が不足しています。管理者にFirestoreインデックスを確認してもらってください。';
  if (code.includes('too-many-requests')) return '操作回数が多いため、しばらく待ってから再試行してください。';
  if (code.startsWith('auth/') && !code.includes('network')) return 'ログインできませんでした。メールアドレスとパスワード、Authenticationの設定を確認してください。';
  return '通信に失敗しました。接続を確認して再試行してください。';
}
function authUI() {
  document.querySelector('#auth-state').textContent = canWrite() ? '投稿・返信ができます' : user ? '閲覧のみのアカウント' : '閲覧モード';
  document.querySelector('#login-link').hidden = Boolean(user);
  document.querySelector('#logout').hidden = !user;
  document.querySelector('#logout').disabled = sending;
  for (const fieldset of app.querySelectorAll('fieldset[data-writer]')) fieldset.disabled = !canWrite() || sending;
  for (const gate of app.querySelectorAll('[data-gate]')) gate.hidden = canWrite();
}
function gate() {
  const box = el('p',undefined,'notice');box.dataset.gate = '';
  box.append(el('span','投稿・返信には共通アカウントでのログインが必要です。 '),link('ログインする','#/login'));return box;
}
function field(name,label,max,type='text') {
  const wrapper = el('label',undefined,'field'), caption = el('span',label);caption.id = `label-${name}`;wrapper.append(caption);
  const input = el(type === 'textarea' ? 'textarea' : 'input');input.name = name;input.required = true;input.setAttribute('aria-labelledby',caption.id);
  if (type !== 'textarea') input.type = type;
  if (max) input.maxLength = max;
  if (name === 'nickname') {input.value = nickname;input.autocomplete = 'nickname';}
  wrapper.append(input);
  if (max) wrapper.append(el('small',`1〜${max}文字`,'hint'));
  return wrapper;
}
function writingForm(reply,id) {
  const form = el('form',undefined,'card form-card');form.append(el('h2',reply ? '返信する' : '新しい投稿'),gate());
  const fieldset = el('fieldset');fieldset.dataset.writer = '';fieldset.style.border = '0';fieldset.style.padding = '0';fieldset.style.margin = '0';
  fieldset.append(field('nickname','ニックネーム',LIMITS.nickname));
  if (!reply) {
    const label = el('label',undefined,'field'), select = el('select');select.name = 'categoryId';select.required = true;
    const caption = el('span','カテゴリー');caption.id = 'label-categoryId';select.setAttribute('aria-labelledby',caption.id);label.append(caption);select.append(new Option('カテゴリーを選択',''));
    categories.forEach(c => select.append(new Option(c.name,c.id)));label.append(select);fieldset.append(label,field('title','タイトル',LIMITS.title));
  }
  fieldset.append(field('body',reply ? '返信内容' : '本文',reply ? LIMITS.reply : LIMITS.body,'textarea'),el('p','内容は一般公開されます。','hint'));
  const submit = el('button',reply ? '返信を投稿' : '投稿する');submit.type = 'submit';fieldset.append(submit);form.append(fieldset);
  const result = el('p',undefined,'notice');result.setAttribute('role','status');form.append(result);
  form.addEventListener('submit',async event => {
    event.preventDefault();if (sending) return;
    const token = view;
    if (!canWrite()) {result.textContent = '共通アカウントでログインしてください。';return;}
    let data;
    try {data = validateFields(Object.fromEntries([...new FormData(form)].map(([k,v]) => [k,String(v).trim()])),categories,reply);}
    catch(error) {result.textContent = error.message;return;}
    sending = true;authUI();result.textContent = '送信中…';
    try {
      const doc = reply ? await api.createReply(id,data) : await api.createPost(data);
      nickname = data.nickname;
      if (token !== view) return;
      if (reply) {form.elements.body.value = '';await route();}
      else location.hash = `#/post/${doc.id}`;
    } catch(error) {if (token === view) result.textContent = message(error);}
    finally {sending = false;authUI();}
  });
  return form;
}
async function list(token) {
  const toolbar = el('div',undefined,'toolbar'), label = el('label'), select = el('select');
  label.append(el('span','カテゴリー'));select.append(new Option('すべての投稿',''));categories.forEach(c => select.append(new Option(c.name,c.id)));label.append(select);
  const params = new URLSearchParams(location.hash.split('?')[1] || ''), filter = params.get('category') || '';
  if (filter && !categories.some(c => c.id === filter)) {app.append(el('p','カテゴリーが見つかりません。','notice'),link('すべての投稿を見る','#/'));return;}
  select.value = filter;select.addEventListener('change',() => {location.hash = select.value ? `#/?category=${encodeURIComponent(select.value)}` : '#/';});
  toolbar.append(label,link('新しい投稿','#/new','button'));app.append(toolbar);
  const posts = el('section');posts.setAttribute('aria-label','投稿一覧');const result = el('p','投稿を読み込み中…','notice');
  const more = el('button','さらに読み込む','secondary');more.hidden = true;app.append(posts,result,more);
  let cursor, loading = false;
  async function load() {
    if (loading) return;loading = true;more.disabled = true;
    try {
      const page = await api.posts(filter,cursor);if (token !== view) return;
      for (const p of page.items) {
        if (!validId(p.id)) continue;
        const card = link('',`#/post/${p.id}`,'card post-card');
        card.append(el('span',categoryName(p.categoryId),'tag'),el('h2',String(p.title || ''),'post-title'),el('div',`${String(p.nickname || '')} · ${date(p.createdAt)}`,'meta'),el('p',String(p.body || '').slice(0,140),'preview'));posts.append(card);
      }
      cursor = page.cursor;more.hidden = !page.more;result.textContent = !posts.children.length ? 'まだ投稿はありません。' : '';
    } catch(error) {if (token === view) {result.textContent = message(error);more.hidden = false;more.textContent = '再試行';}}
    finally {loading = false;more.disabled = false;}
  }
  more.addEventListener('click',load);await load();
}
async function detail(token,id) {
  app.append(link('← 投稿一覧へ','#/','back'));const result = el('p','投稿を読み込み中…','notice');app.append(result);
  try {
    const p = await api.post(id);if (token !== view) return;
    if (!p) {result.textContent = '投稿が見つかりません。';return;}
    result.textContent = '';const article = el('article',undefined,'card');
    article.append(el('span',categoryName(p.categoryId),'tag'),el('h2',String(p.title || '')),
      el('p',`${String(p.nickname || '')} · ${date(p.createdAt)}`,'meta'),el('p',String(p.body || ''),'body-text'));app.append(article);
    const section = el('section',undefined,'card'), replies = el('div'), replyStatus = el('p','返信を読み込み中…','notice'), more = el('button','返信をさらに読み込む','secondary');more.hidden = true;
    section.append(el('h2','返信'),replies,replyStatus,more);app.append(section,writingForm(true,id));authUI();
    let cursor, loading = false;
    async function load() {
      if (loading) return;loading = true;more.disabled = true;
      try {
        const page = await api.replies(id,cursor);if (token !== view) return;
        page.items.forEach(r => {const entry = el('article',undefined,'reply');entry.append(el('p',`${String(r.nickname || '')} · ${date(r.createdAt)}`,'meta'),el('p',String(r.body || ''),'body-text'));replies.append(entry);});
        cursor = page.cursor;more.hidden = !page.more;replyStatus.textContent = replies.children.length ? '' : 'まだ返信はありません。';
      } catch(error) {if (token === view) {replyStatus.textContent = message(error);more.hidden = false;more.textContent = '再試行';}}
      finally {loading = false;more.disabled = false;}
    }
    more.addEventListener('click',load);await load();
  } catch(error) {if (token === view) result.textContent = message(error);}
}
function login() {
  app.append(link('← 投稿一覧へ','#/','back'));
  const form = el('form',undefined,'card form-card'), email = field('email','共通メールアドレス',null,'email'), password = field('password','パスワード',null,'password');
  email.querySelector('input').autocomplete = 'username';password.querySelector('input').autocomplete = 'current-password';
  const submit = el('button','ログイン');submit.type = 'submit';submit.disabled = !api;
  const result = el('p',undefined,'notice');result.setAttribute('role','status');
  form.append(el('h2','共通アカウントでログイン'),el('p','ニックネームは投稿・返信の際に入力できます。','hint'),email,password,submit,result);app.append(form);
  form.addEventListener('submit',async event => {
    event.preventDefault();if (!api || submit.disabled) return;
    const token = view;submit.disabled = true;result.textContent = 'ログイン中…';
    try {
      const credentials = await api.login(form.elements.email.value.trim(),form.elements.password.value);
      if (credentials.user.uid !== sharedAccountUid) {await api.logout();if (token === view) result.textContent = '投稿用の共通アカウントではありません。';}
      else {user = credentials.user;authUI();if (token === view) location.hash = '#/';}
    } catch(error) {if (token === view) result.textContent = message(error);}
    finally {form.elements.password.value = '';submit.disabled = false;}
  });
}
async function route() {
  const token = ++view;app.replaceChildren();const path = location.hash.split('?')[0] || '#/';
  if (path === '#/login') login();
  else if (!api) app.append(el('p','掲示板の接続準備中です。','card empty'));
  else if (path === '#/new') {
    app.append(link('← 投稿一覧へ','#/','back'));
    if (!categories.length) app.append(el('p','投稿できるカテゴリーがまだ登録されていません。','notice'));
    else app.append(writingForm(false));
  } else if (path.startsWith('#/post/') && validId(path.slice(7))) await detail(token,path.slice(7));
  else if (path === '#/' || path === '#') await list(token);
  else app.append(el('p','ページが見つかりません。','notice'),link('投稿一覧へ','#/'));
  if (token === view) authUI();
}
document.querySelector('#logout').addEventListener('click',async () => {
  try {await api.logout();user = null;authUI();}catch(error) {status.textContent = message(error);}
});
window.addEventListener('hashchange',() => {void route();document.querySelector('#main').focus();});
async function start() {
  if (!configReady(firebaseConfig)) {status.textContent = '掲示板は準備中です。Firebaseの接続設定が完了すると、投稿を閲覧できます。';await route();return;}
  try {
    api = await connect(firebaseConfig);
    api.watchAuth(value => {user = value;authUI();});
    try {
      categories = (await api.categories()).filter(c => c.active === true && validId(c.id) && typeof c.name === 'string' && c.name.trim() && c.name.length <= 60)
        .sort((a,b) => (Number.isFinite(a.order) ? a.order : 0) - (Number.isFinite(b.order) ? b.order : 0) || a.name.localeCompare(b.name,'ja'));
      status.textContent = categories.length ? '' : 'カテゴリーの登録を準備中です。既存の投稿は閲覧できます。';
    } catch(error) {status.textContent = message(error);}
    await route();
  } catch(error) {status.textContent = message(error);api = undefined;await route();}
}
void start();
