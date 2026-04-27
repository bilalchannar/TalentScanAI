<script>
	import Router from 'svelte-spa-router';
	import { location, replace } from 'svelte-spa-router';
	import { getToken } from './api.js';

	import AuthParent from './pages/auth/AuthParent.svelte';
	import DashParent from './pages/dash/DashParent.svelte';
	import Toast from './components/Toast.svelte';

	const routes = {
		'/auth/*': AuthParent,
		'/dash/*': DashParent,
	};

	$: currentPath = $location || '/';

	$: {
		const token = getToken();

		if (currentPath === '/') {
			replace(token ? '/dash/manage' : '/auth/login');
		} else if (currentPath.startsWith('/dash') && !token) {
			replace('/auth/login');
		} else if (currentPath.startsWith('/auth') && token && currentPath !== '/auth/logout') {
			replace('/dash/manage');
		}
	}
</script>

<Router {routes} />
<Toast />
