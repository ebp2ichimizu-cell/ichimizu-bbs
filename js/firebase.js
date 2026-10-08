// 設定が揃った場合だけSDKを読み込むため、設定前でも画面を表示できます。
export async function connect(config) {
  const [appSdk, authSdk, dbSdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
  ]);
  const app = appSdk.initializeApp(config), auth = authSdk.getAuth(app), db = dbSdk.getFirestore(app);
  await authSdk.setPersistence(auth, authSdk.browserSessionPersistence);
  return {
    watchAuth: callback => authSdk.onAuthStateChanged(auth,callback),
    login: (email,password) => authSdk.signInWithEmailAndPassword(auth,email,password),
    logout: () => authSdk.signOut(auth),
    categories: async () => {
      const snapshot = await dbSdk.getDocs(dbSdk.query(dbSdk.collection(db,'bbsCategories'),dbSdk.limit(50)));
      return snapshot.docs.map(d => ({...d.data(),id:d.id}));
    },
    posts: async (categoryId, cursor) => {
      const clauses = [dbSdk.orderBy('createdAt','desc'),dbSdk.limit(20)];
      if (categoryId) clauses.push(dbSdk.where('categoryId','==',categoryId));
      if (cursor) clauses.push(dbSdk.startAfter(cursor));
      const snapshot = await dbSdk.getDocs(dbSdk.query(dbSdk.collection(db,'bbsPosts'),...clauses));
      return {items:snapshot.docs.map(d => ({...d.data(),id:d.id})),cursor:snapshot.docs.at(-1),more:snapshot.size === 20};
    },
    post: async id => {
      const snapshot = await dbSdk.getDoc(dbSdk.doc(db,'bbsPosts',id));
      return snapshot.exists() ? {...snapshot.data(),id:snapshot.id} : null;
    },
    replies: async (id,cursor) => {
      const clauses = [dbSdk.orderBy('createdAt','asc'),dbSdk.limit(50)];
      if (cursor) clauses.push(dbSdk.startAfter(cursor));
      const snapshot = await dbSdk.getDocs(dbSdk.query(dbSdk.collection(db,'bbsPosts',id,'replies'),...clauses));
      return {items:snapshot.docs.map(d => ({...d.data(),id:d.id})),cursor:snapshot.docs.at(-1),more:snapshot.size === 50};
    },
    createPost: data => dbSdk.addDoc(dbSdk.collection(db,'bbsPosts'),{...data,createdAt:dbSdk.serverTimestamp()}),
    createReply: (id,data) => dbSdk.addDoc(dbSdk.collection(db,'bbsPosts',id,'replies'),{...data,createdAt:dbSdk.serverTimestamp()})
  };
}
