<?php
namespace Socketty;

use Symfony\Component\HttpFoundation\Session\SessionInterface;

interface AuthenticatorInterface{
    /**
     * @param $session SessionInterface|null
     *
     * @return bool    true if authenticated, false if not
     */
    public function check(SessionInterface $session = null);
}