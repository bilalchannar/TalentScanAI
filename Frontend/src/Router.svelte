<script>
	import Router from 'svelte-spa-router';
	import { location, replace } from 'svelte-spa-router';

	import AuthParent from './pages/auth/AuthParent.svelte';
	import DashParent from './pages/dash/DashParent.svelte';
	import Toast from './components/Toast.svelte';

	const routes = {
		'/auth/*': AuthParent,
		'/dash/*': DashParent,
	};

	if ($location == '/') {
		replace("/auth/login");
	}
</script>

<Router {routes} />
<Toast />
