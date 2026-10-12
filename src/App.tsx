import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { About } from './pages/About';
import { Categories } from './pages/Categories';
import { CheatSheets } from './pages/CheatSheets';
import { Home } from './pages/Home';
import { Links } from './pages/Links';
import { NotFound } from './pages/NotFound';
import { Privacy } from './pages/Privacy';
import { Search } from './pages/Search';
import { Technologies } from './pages/Technologies';
import { Terms } from './pages/Terms';

// 技術ページは補足データ（クイックリファレンス等）を含むため分割して読み込む
const TechnologyDetail = lazy(() => import('./pages/TechnologyDetail').then((m) => ({ default: m.TechnologyDetail })));

const CheatSheetTool = lazy(() => import('./pages/CheatSheetTool').then((m) => ({ default: m.CheatSheetTool })));

/** ルーティング。ページ追加時はここに1行追加し、seo/meta.ts と seo/routes.ts にも登録する */
export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="categories" element={<Categories />} />
          <Route path="technologies" element={<Technologies />} />
          <Route path="technology" element={<Navigate to="/technologies" replace />} />
          <Route path="technology/:slug" element={<TechnologyDetail />} />
          <Route path="technology/:slug/cheatsheet" element={<CheatSheetTool />} />
          <Route path="cheatsheets" element={<CheatSheets />} />
          <Route path="search" element={<Search />} />
          <Route path="about" element={<About />} />
          <Route path="links" element={<Links />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
