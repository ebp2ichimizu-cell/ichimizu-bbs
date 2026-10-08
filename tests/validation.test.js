import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFields,configReady,validId} from '../js/validation.js';
const categories = [{id:'test-category'}];
const post = {nickname:'テスト',title:'テスト投稿',body:'本文',categoryId:'test-category'};
test('投稿と返信の入力を検証する',() => {
  assert.equal(validateFields(post,categories),post);
  assert.doesNotThrow(() => validateFields({nickname:'a'.repeat(30),title:'a'.repeat(100),body:'a'.repeat(5000),categoryId:'test-category'},categories));
  assert.doesNotThrow(() => validateFields({nickname:'テスト',body:'a'.repeat(2000)},categories,true));
});
test('空欄、型、超過、未知カテゴリー、余分な項目を拒否する',() => {
  for (const bad of [{nickname:' \n\t '},{nickname:'a'.repeat(31)},{title:'a'.repeat(101)},{body:'a'.repeat(5001)},{body:2},{categoryId:'unknown'},{categoryId:'../test-category'},{extra:true}]) assert.throws(() => validateFields({...post,...bad},categories));
  assert.throws(() => validateFields({nickname:'テスト',body:'a'.repeat(2001)},categories,true));
  assert.throws(() => validateFields({nickname:'テスト',body:'\n\t '},categories,true));
  assert.throws(() => validateFields({nickname:'テスト',body:'本文',title:'余分'},categories,true));
});
test('HTMLを文字列として受け入れ、表示層がtextContentで表示する',() => {
  assert.equal(validateFields({...post,body:'<script>alert(1)</script>'},categories).body,'<script>alert(1)</script>');
});
test('接続未設定と異なるプロジェクトを拒否する',() => {
  assert.equal(configReady({projectId:'ichimizu-bbs',apiKey:'',authDomain:'',appId:''}),false);
  assert.equal(configReady({projectId:'other',apiKey:'x',authDomain:'x',appId:'x'}),false);
  assert.equal(configReady({projectId:'ichimizu-bbs',apiKey:'x',authDomain:'x',appId:'x'}),true);
  assert.equal(validId('a_b-123'),true);assert.equal(validId('a/b'),false);assert.equal(validId(''),false);
});
