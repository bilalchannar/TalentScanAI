<script>
    import Router from 'svelte-spa-router';

    import Forgot from "./Forgot.svelte";
	import Login from "./Login.svelte";
	import Logout from "./Logout.svelte";
	import Reset from "./Reset.svelte";
	import Signup from "./Signup.svelte";

	const routes = {
		'/auth/forgot': Forgot,
		'/auth/login': Login,
		'/auth/logout': Logout,
		'/auth/reset': Reset,
		'/auth/signup': Signup,
    }
</script>

<div class="auth-root">
    <Router {routes} />
</div>

<style>
    .auth-root {
        width: 100vw;
        height: 100vh;
        overflow-x: hidden;
    }
</style>