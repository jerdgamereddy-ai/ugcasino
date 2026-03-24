--
-- PostgreSQL database dump
--

\restrict RDbYWIzBuRaMR4nmo0Wfa61B0H9mwTCevrfiq6dWcWKLI9LXEMwN34sIwknMA3h

-- Dumped from database version 16.12 (6d3029c)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: _system; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA _system;


ALTER SCHEMA _system OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: replit_database_migrations_v1; Type: TABLE; Schema: _system; Owner: neondb_owner
--

CREATE TABLE _system.replit_database_migrations_v1 (
    id bigint NOT NULL,
    build_id text NOT NULL,
    deployment_id text NOT NULL,
    statement_count bigint NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE _system.replit_database_migrations_v1 OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE; Schema: _system; Owner: neondb_owner
--

CREATE SEQUENCE _system.replit_database_migrations_v1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE OWNED BY; Schema: _system; Owner: neondb_owner
--

ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNED BY _system.replit_database_migrations_v1.id;


--
-- Name: admin_security_answers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.admin_security_answers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    question text NOT NULL,
    answer text NOT NULL
);


ALTER TABLE public.admin_security_answers OWNER TO neondb_owner;

--
-- Name: admin_security_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.admin_security_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_security_answers_id_seq OWNER TO neondb_owner;

--
-- Name: admin_security_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.admin_security_answers_id_seq OWNED BY public.admin_security_answers.id;


--
-- Name: broadcast_dismissals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.broadcast_dismissals (
    id integer NOT NULL,
    broadcast_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.broadcast_dismissals OWNER TO neondb_owner;

--
-- Name: broadcast_dismissals_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.broadcast_dismissals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcast_dismissals_id_seq OWNER TO neondb_owner;

--
-- Name: broadcast_dismissals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.broadcast_dismissals_id_seq OWNED BY public.broadcast_dismissals.id;


--
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.broadcasts (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    sender_role text NOT NULL,
    target_role text NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    font_family text DEFAULT 'sans-serif'::text,
    color text DEFAULT '#FFD700'::text,
    scroll_speed integer DEFAULT 15,
    expires_at timestamp without time zone
);


ALTER TABLE public.broadcasts OWNER TO neondb_owner;

--
-- Name: broadcasts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.broadcasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcasts_id_seq OWNER TO neondb_owner;

--
-- Name: broadcasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.broadcasts_id_seq OWNED BY public.broadcasts.id;


--
-- Name: game_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.game_settings (
    id integer NOT NULL,
    game_type text NOT NULL,
    win_chance double precision DEFAULT 0.3 NOT NULL,
    updated_by integer NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    min_bet integer DEFAULT 500 NOT NULL,
    payout_multiplier double precision DEFAULT 1.95 NOT NULL
);


ALTER TABLE public.game_settings OWNER TO neondb_owner;

--
-- Name: game_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.game_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_settings_id_seq OWNER TO neondb_owner;

--
-- Name: game_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.game_settings_id_seq OWNED BY public.game_settings.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO neondb_owner;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO neondb_owner;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.transactions OWNER TO neondb_owner;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO neondb_owner;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    is_approved boolean DEFAULT false NOT NULL,
    is_suspended boolean DEFAULT false NOT NULL,
    created_by integer,
    profit_share_percentage double precision DEFAULT 0 NOT NULL,
    phone_number text,
    withdraw_code text,
    last_active timestamp without time zone
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vouchers (
    id integer NOT NULL,
    code text NOT NULL,
    amount integer NOT NULL,
    created_by integer NOT NULL,
    redeemed_by integer,
    is_redeemed boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vouchers OWNER TO neondb_owner;

--
-- Name: vouchers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.vouchers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vouchers_id_seq OWNER TO neondb_owner;

--
-- Name: vouchers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.vouchers_id_seq OWNED BY public.vouchers.id;


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.withdrawal_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    processed_at timestamp without time zone,
    processed_by integer,
    manager_code text,
    manager_id integer
);


ALTER TABLE public.withdrawal_requests OWNER TO neondb_owner;

--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.withdrawal_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.withdrawal_requests_id_seq OWNER TO neondb_owner;

--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.withdrawal_requests_id_seq OWNED BY public.withdrawal_requests.id;


--
-- Name: replit_database_migrations_v1 id; Type: DEFAULT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1 ALTER COLUMN id SET DEFAULT nextval('_system.replit_database_migrations_v1_id_seq'::regclass);


--
-- Name: admin_security_answers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_security_answers ALTER COLUMN id SET DEFAULT nextval('public.admin_security_answers_id_seq'::regclass);


--
-- Name: broadcast_dismissals id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.broadcast_dismissals ALTER COLUMN id SET DEFAULT nextval('public.broadcast_dismissals_id_seq'::regclass);


--
-- Name: broadcasts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.broadcasts ALTER COLUMN id SET DEFAULT nextval('public.broadcasts_id_seq'::regclass);


--
-- Name: game_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_settings ALTER COLUMN id SET DEFAULT nextval('public.game_settings_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vouchers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vouchers ALTER COLUMN id SET DEFAULT nextval('public.vouchers_id_seq'::regclass);


--
-- Name: withdrawal_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.withdrawal_requests ALTER COLUMN id SET DEFAULT nextval('public.withdrawal_requests_id_seq'::regclass);


--
-- Data for Name: replit_database_migrations_v1; Type: TABLE DATA; Schema: _system; Owner: neondb_owner
--

COPY _system.replit_database_migrations_v1 (id, build_id, deployment_id, statement_count, applied_at) FROM stdin;
1	aece172b-08fb-4706-b2cb-0a42f3c2478a	f41681be-f6c0-4016-95a4-fd3e5df6b4bc	4	2026-02-11 08:51:17.004586+00
2	402f765b-6ec6-42c2-a6ea-949e049eaac8	f41681be-f6c0-4016-95a4-fd3e5df6b4bc	2	2026-02-24 03:30:30.146693+00
\.


--
-- Data for Name: admin_security_answers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.admin_security_answers (id, user_id, question, answer) FROM stdin;
1	8	What is your village of birth?	buhwanja
2	8	What is your grandpa's name?	gabula
3	8	What is your favourite meal?	kalo+fish
4	8	Who was your first lover?	mackline
5	9	What is your village of birth?	buhwanja
6	9	What is your grandpa's name?	gabula
7	9	What is your favourite meal?	kalo+fish
8	9	Who was your first lover?	mackline
\.


--
-- Data for Name: broadcast_dismissals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.broadcast_dismissals (id, broadcast_id, user_id) FROM stdin;
1	1	11
2	2	2
3	1	17
4	2	20
5	4	20
6	4	9
7	4	27
\.


--
-- Data for Name: broadcasts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.broadcasts (id, sender_id, sender_role, target_role, message, created_at, font_family, color, scroll_speed, expires_at) FROM stdin;
1	2	super_manager	manager	hello folks, we have a new game coming soon. stay sober	2026-02-09 11:29:51.08651	sans-serif	#FFD700	15	\N
2	9	admin	super_manager	system upgrade running tonight	2026-02-09 19:54:36.387543	sans-serif	#FFD700	15	\N
3	9	admin	public	Happy birthday 🎉 to President Kyagulanyi	2026-02-12 04:36:51.034914	sans-serif	#FFD700	15	2026-02-12 04:51:51.025
4	9	admin	public	Hello	2026-02-15 18:24:57.173531	sans-serif	#FFD700	15	\N
\.


--
-- Data for Name: game_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.game_settings (id, game_type, win_chance, updated_by, updated_at, min_bet, payout_multiplier) FROM stdin;
7	mines	0.26	9	2026-02-15 14:32:36.426	500	1.95
9	poker	0.31	9	2026-02-15 14:33:54.155	500	1.95
10	keno	0.29	9	2026-02-16 19:14:05.768	500	1.95
2	roulette	0.23	9	2026-02-16 19:14:28.976	500	1.95
59	classic-slots	0.3	9	2026-02-19 17:27:25.452986	500	1.95
6	plinko	0.33	9	2026-02-21 05:03:47.886	500	1.95
20	fishhunt	0.28	9	2026-02-21 05:17:26.808	500	1.95
8	wheel	0.32	9	2026-02-21 05:17:36.664	500	1.95
4	hilo	0.22	9	2026-02-24 03:40:38.21	500	5
3	dice	0.22	9	2026-02-24 03:40:58.914	500	3
5	coinflip	0.32	9	2026-02-24 03:41:36.605	500	2.5
1	slots	0.4	9	2026-02-27 17:31:36.212	500	2.5
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.messages (id, sender_id, receiver_id, content, is_read, created_at) FROM stdin;
1	9	2	hi	f	2026-02-08 19:42:56.309575
2	11	2	hello sir, testing the sys	t	2026-02-09 20:07:59.387108
3	9	2	yes	f	2026-02-09 21:34:39.734608
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
qeK_Ba2HSXDwltp42jnbMUHIfFt-t-Nt	{"cookie":{"originalMaxAge":null,"expires":null,"httpOnly":true,"path":"/"}}	2026-03-10 20:18:50
1q0weOD_mDXPAqArfJkY9l3duFeVRUqr	{"cookie":{"originalMaxAge":null,"expires":null,"httpOnly":true,"path":"/"},"passport":{"user":9}}	2026-03-11 17:23:02
oMz2pGYR1Exz1s8vOOywFuiwXcTuZIck	{"cookie":{"originalMaxAge":null,"expires":null,"httpOnly":true,"path":"/"}}	2026-03-10 14:23:29
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.transactions (id, user_id, amount, type, description, created_at) FROM stdin;
1	4	1000	voucher_redemption	Redeemed voucher 653D8271	2026-01-16 12:13:00.122174
2	4	-100	bet	Slots spin	2026-01-16 12:13:14.766688
3	4	-500	bet	Slots spin	2026-01-16 12:13:20.28249
4	4	-100	bet	Slots spin	2026-01-16 12:13:28.889062
5	4	-100	bet	Slots spin	2026-01-16 12:13:35.756979
6	4	1000	win	Slots win	2026-01-16 12:13:35.764685
7	4	-1000	bet	Slots spin	2026-01-16 12:13:42.094732
8	4	-100	bet	Slots spin	2026-01-16 12:13:45.420473
9	4	-100	bet	Slots spin	2026-01-16 12:13:48.954827
10	4	1000	win	Slots win	2026-01-16 12:13:48.963726
11	4	-1000	bet	Slots spin	2026-01-16 12:13:53.860667
12	4	1000	voucher_redemption	Redeemed voucher 937FBE79	2026-01-19 00:27:06.358109
13	4	-100	bet	Dice roll	2026-01-19 00:27:12.646942
14	4	-100	bet	Dice roll	2026-01-19 00:27:23.005241
15	4	-100	bet	Dice roll	2026-01-19 00:27:29.057791
16	4	-100	bet	Dice roll	2026-01-19 00:27:38.15138
17	4	-100	bet	Dice roll	2026-01-19 00:27:42.413297
18	4	200	win	Dice win	2026-01-19 00:27:42.420446
19	4	-100	bet	Dice roll	2026-01-19 00:27:49.404382
20	4	200	win	Dice win	2026-01-19 00:27:49.41259
21	4	-100	bet	Dice roll	2026-01-19 00:27:54.773092
22	4	-100	bet	Dice roll	2026-01-19 00:28:00.30944
23	4	-100	bet	Dice roll	2026-01-19 00:28:04.058267
24	4	200	win	Dice win	2026-01-19 00:28:04.064614
25	4	-100	bet	Dice roll	2026-01-19 00:28:08.962227
26	4	-100	bet	Dice roll	2026-01-19 00:28:11.986881
27	4	200	win	Dice win	2026-01-19 00:28:11.993269
28	4	-100	bet	Dice roll	2026-01-19 00:28:14.780424
29	4	-100	bet	Dice roll	2026-01-19 00:28:17.40045
30	4	200	win	Dice win	2026-01-19 00:28:17.40755
31	4	-100	bet	Dice roll	2026-01-19 00:28:20.84455
32	4	200	win	Dice win	2026-01-19 00:28:20.853007
33	4	-100	bet	Slots spin	2026-01-19 00:28:32.267545
34	4	-500	bet	Slots spin	2026-01-19 00:28:36.482246
35	4	-100	bet	HiLo play	2026-01-19 00:28:59.043815
36	4	-100	bet	HiLo play	2026-01-19 00:29:14.729427
37	4	200	win	HiLo win	2026-01-19 00:29:14.736691
38	4	-100	bet	HiLo play	2026-01-19 00:29:19.984442
39	4	-100	bet	HiLo play	2026-01-19 00:29:27.54532
40	4	200	win	HiLo win	2026-01-19 00:29:27.555991
41	4	-100	bet	HiLo play	2026-01-19 00:29:30.590456
42	4	-100	bet	Dice roll	2026-01-19 00:30:34.111072
43	4	200	win	Dice win	2026-01-19 00:30:34.119816
44	4	-100	bet	Dice roll	2026-01-19 00:30:39.429609
45	4	200	win	Dice win	2026-01-19 00:30:39.436455
46	4	-100	bet	Dice roll	2026-01-19 00:30:43.10839
47	4	-100	bet	Dice roll	2026-01-19 00:30:45.566195
48	4	200	win	Dice win	2026-01-19 00:30:45.577062
49	4	-100	bet	Dice roll	2026-01-19 00:30:47.638294
50	4	200	win	Dice win	2026-01-19 00:30:47.644355
51	4	-100	bet	Dice roll	2026-01-19 00:30:49.967697
52	4	200	win	Dice win	2026-01-19 00:30:49.974029
53	4	-100	bet	Dice roll	2026-01-19 00:30:51.933324
54	4	-100	bet	HiLo play	2026-01-19 00:31:05.905619
55	4	200	win	HiLo win	2026-01-19 00:31:05.913968
56	4	-100	bet	HiLo play	2026-01-19 00:31:09.231531
57	4	200	win	HiLo win	2026-01-19 00:31:09.238112
58	4	-200	bet	HiLo play	2026-01-19 00:31:32.290353
59	4	-200	bet	HiLo play	2026-01-19 00:31:37.027819
60	4	400	win	HiLo win	2026-01-19 00:31:37.035108
61	4	-200	bet	HiLo play	2026-01-19 00:31:44.516501
62	4	-200	bet	HiLo play	2026-01-19 00:31:48.23103
63	4	-200	bet	HiLo play	2026-01-19 00:31:50.547644
64	4	1000	voucher_redemption	Redeemed voucher B9E04730	2026-01-19 00:51:07.314904
65	4	-500	bet	Coin Flip play	2026-01-19 00:51:21.834806
66	4	-500	bet	Coin Flip play	2026-01-19 00:51:36.704158
67	5	2000	voucher_redemption	Redeemed voucher 7F8D6EAB	2026-01-19 09:14:40.995319
68	5	-500	bet	Coin Flip play	2026-01-19 09:15:00.33844
69	5	975	win	Coin Flip win	2026-01-19 09:15:00.34595
70	5	-500	bet	Coin Flip play	2026-01-19 09:15:17.040732
71	5	975	win	Coin Flip win	2026-01-19 09:15:17.047594
72	5	-500	bet	Coin Flip play	2026-01-19 09:15:22.553852
73	5	-500	bet	Coin Flip play	2026-01-19 09:15:26.889885
74	5	-500	bet	Coin Flip play	2026-01-19 09:15:30.458952
75	5	975	win	Coin Flip win	2026-01-19 09:15:30.464419
76	5	-1000	bet	Coin Flip play	2026-01-19 09:15:54.368142
77	5	-1000	withdrawal	Withdrawal request pending: 1	2026-01-19 09:19:16.587191
78	5	4000	voucher_redemption	Redeemed voucher B4FB5180	2026-01-19 09:22:34.289987
79	5	-100	bet	Coin Flip play	2026-01-19 09:22:51.069707
80	5	-1000	bet	Coin Flip play	2026-01-19 09:23:03.272423
81	5	-1000	bet	Coin Flip play	2026-01-19 09:23:11.653346
82	5	-500	bet	HiLo play	2026-01-19 09:24:04.726913
83	5	-500	bet	HiLo play	2026-01-19 09:25:01.961749
84	5	1000	win	HiLo win	2026-01-19 09:25:01.969854
85	5	-500	bet	HiLo play	2026-01-19 09:25:13.457415
86	5	-500	bet	HiLo play	2026-01-19 09:25:26.187778
87	5	1000	win	HiLo win	2026-01-19 09:25:26.194024
88	5	-500	bet	Slots spin	2026-01-19 09:25:43.349698
89	5	-500	bet	Slots spin	2026-01-19 09:25:47.999433
90	5	5000	win	Slots win	2026-01-19 09:25:48.00743
91	5	-5000	withdrawal	Withdrawal request pending: 2	2026-01-19 09:26:08.678355
92	5	-500	bet	Dice roll	2026-01-19 09:28:49.325727
93	5	1000	win	Dice win	2026-01-19 09:28:49.332475
94	5	-500	bet	Dice roll	2026-01-19 09:29:12.715735
95	5	-500	bet	Dice roll	2026-01-19 09:29:22.488624
96	5	-500	bet	Dice roll	2026-01-19 09:30:12.476873
97	5	-100	bet	Roulette spin	2026-01-19 09:30:42.835388
98	5	3500	win	Roulette win	2026-01-19 09:30:42.842716
99	5	-100	bet	Roulette spin	2026-01-19 09:30:51.140765
100	5	-100	bet	Roulette spin	2026-01-19 09:30:59.580107
101	5	-100	bet	Slots spin	2026-01-19 09:36:20.554661
102	5	-1000	bet	Slots spin	2026-01-19 09:36:25.316058
103	5	10000	win	Slots win	2026-01-19 09:36:25.322764
104	5	-5000	bet	Slots spin	2026-01-19 09:36:30.480927
105	5	-5000	bet	Slots spin	2026-01-19 09:36:39.067347
106	5	-1000	bet	Slots spin	2026-01-19 09:36:44.885157
107	5	-1000	bet	Slots spin	2026-01-19 09:36:48.947597
108	3	-500	withdrawal	Admin withdrawal: admin	2026-01-19 09:39:51.692137
109	3	-10000	bet	Coin Flip play	2026-01-21 04:36:02.586909
110	3	19500	win	Coin Flip win	2026-01-21 04:36:02.726639
111	3	-10000	bet	Coin Flip play	2026-01-21 04:36:13.323899
112	3	-10000	bet	Coin Flip play	2026-01-21 04:36:17.47044
113	3	-10000	bet	Coin Flip play	2026-01-21 04:36:22.741655
114	3	-10000	bet	Coin Flip play	2026-01-21 04:36:27.134407
115	3	19500	win	Coin Flip win	2026-01-21 04:36:27.144868
116	3	-10000	bet	Coin Flip play	2026-01-21 04:36:31.382495
117	3	19500	win	Coin Flip win	2026-01-21 04:36:31.390609
118	3	-10000	bet	Coin Flip play	2026-01-21 04:36:36.159633
119	3	19500	win	Coin Flip win	2026-01-21 04:36:36.165478
120	3	-10000	bet	Coin Flip play	2026-01-21 04:36:41.024561
121	3	19500	win	Coin Flip win	2026-01-21 04:36:41.032761
122	3	-10000	bet	Coin Flip play	2026-01-21 04:36:45.890486
123	3	-50000	bet	Coin Flip play	2026-01-21 04:36:58.280203
124	3	-5000	bet	Coin Flip play	2026-01-21 04:37:08.220614
125	3	-1000	bet	Coin Flip play	2026-01-21 04:37:17.36304
126	3	1950	win	Coin Flip win	2026-01-21 04:37:17.371763
127	3	-1000	bet	Coin Flip play	2026-01-21 04:37:22.889316
128	3	-1000	bet	Coin Flip play	2026-01-21 04:37:27.509972
129	3	1950	win	Coin Flip win	2026-01-21 04:37:27.516735
130	3	-1000	bet	Coin Flip play	2026-01-21 04:37:32.08505
131	3	-1000	bet	Coin Flip play	2026-01-21 04:37:36.512509
132	3	-500	bet	Coin Flip play	2026-01-21 04:37:45.349935
133	3	975	win	Coin Flip win	2026-01-21 04:37:45.35751
134	3	-500	bet	Coin Flip play	2026-01-21 04:37:50.273533
135	3	-500	bet	Coin Flip play	2026-01-21 04:37:58.478482
136	3	-100	bet	Poker deal	2026-01-21 04:48:45.991231
137	3	-100	bet	Poker deal	2026-01-21 04:49:06.421765
138	3	200	win	Poker win	2026-01-21 04:49:12.005788
139	3	-100	bet	Poker deal	2026-01-21 04:49:27.872514
140	3	200	win	Poker win	2026-01-21 04:49:35.143225
141	3	-100	bet	Poker deal	2026-01-21 04:49:46.457456
142	3	-100	bet	Poker deal	2026-01-21 04:50:03.484164
143	3	200	win	Poker win	2026-01-21 04:50:08.892642
144	3	-100	bet	Poker deal	2026-01-21 04:50:16.629208
145	3	-100	bet	Poker deal	2026-01-21 04:50:32.926372
146	3	-100	bet	Poker deal	2026-01-21 04:50:47.210044
147	3	-100	bet	Poker deal	2026-01-21 04:50:58.84117
148	5	1000	voucher_redemption	Redeemed voucher F6A10FF0	2026-01-21 05:18:19.424238
149	5	-100	bet	Coin Flip play	2026-01-21 05:18:39.795851
150	5	-100	bet	Coin Flip play	2026-01-21 05:18:44.64855
151	5	195	win	Coin Flip win	2026-01-21 05:18:44.656541
152	5	-1000	bet	Dice roll	2026-01-21 05:19:10.795702
153	5	-400	bet	Dice roll	2026-01-21 05:19:23.838035
154	5	800	win	Dice win	2026-01-21 05:19:23.845692
155	5	-400	bet	Dice roll	2026-01-21 05:19:35.974147
156	5	-400	bet	Dice roll	2026-01-21 05:19:41.920682
157	6	2000	voucher_redemption	Guest login with voucher 422F3123	2026-01-22 06:11:08.00213
158	6	-1000	bet	Dice roll	2026-01-22 06:11:56.972302
159	6	2000	win	Dice win	2026-01-22 06:11:56.980544
160	6	-2000	bet	Dice roll	2026-01-22 06:12:12.965302
161	6	4000	win	Dice win	2026-01-22 06:12:12.974818
162	6	-4000	bet	Dice roll	2026-01-22 06:12:23.395937
163	6	8000	win	Dice win	2026-01-22 06:12:23.406956
164	6	-9000	bet	Dice roll	2026-01-22 06:12:37.965185
165	6	18000	win	Dice win	2026-01-22 06:12:37.984547
166	6	-18000	bet	Dice roll	2026-01-22 06:12:52.171011
167	6	36000	win	Dice win	2026-01-22 06:12:52.178523
168	6	-29000	bet	Dice roll	2026-01-22 06:13:19.27681
169	6	58000	win	Dice win	2026-01-22 06:13:19.287971
170	6	-65000	bet	Dice roll	2026-01-22 06:13:35.318346
171	7	1000	voucher_redemption	Guest login with voucher 632E76C7	2026-01-22 10:52:24.633311
172	7	-500	bet	Dice roll	2026-01-22 10:57:27.316019
173	7	-500	bet	Dice roll	2026-01-22 10:57:36.960511
174	7	1000	win	Dice win	2026-01-22 10:57:36.970829
175	7	-500	bet	Dice roll	2026-01-22 10:57:45.411135
176	7	1000	win	Dice win	2026-01-22 10:57:45.427726
177	7	-1000	bet	Dice roll	2026-01-22 10:57:58.97414
178	7	-500	bet	Dice roll	2026-01-22 10:58:14.291754
179	4	1000	voucher_redemption	Redeemed voucher ED24F351	2026-01-22 20:18:11.510859
180	4	-100	bet	Dice roll	2026-01-22 20:18:49.498304
181	4	-100	bet	Dice roll	2026-01-22 20:18:52.669957
182	4	-100	bet	Dice roll	2026-01-22 20:18:57.743234
183	4	-100	bet	Dice roll	2026-01-22 20:19:01.300917
184	4	-100	bet	Dice roll	2026-01-22 20:19:04.717365
185	4	-100	bet	Dice roll	2026-01-22 20:19:09.482878
186	4	200	win	Dice win	2026-01-22 20:19:09.489546
187	4	-100	bet	Dice roll	2026-01-22 20:19:16.299466
188	4	-100	bet	Dice roll	2026-01-22 20:19:21.431813
189	4	-100	bet	Dice roll	2026-01-22 20:19:25.866261
190	4	-100	bet	Dice roll	2026-01-22 20:19:30.553916
191	4	-100	bet	Dice roll	2026-01-22 20:19:33.433438
192	4	-100	bet	Dice roll	2026-01-22 20:19:38.772389
193	9	1000	voucher_redemption	Redeemed voucher A18AC66C	2026-02-08 20:10:43.320912
194	9	-500	bet	Wheel spin	2026-02-08 20:11:00.416165
195	9	500	win	Wheel win x1	2026-02-08 20:11:00.424293
196	9	-500	bet	Wheel spin	2026-02-08 20:11:14.655615
197	9	2500	win	Wheel win x5	2026-02-08 20:11:14.664132
198	9	-500	bet	Wheel spin	2026-02-08 20:11:31.2955
199	9	-500	bet	Wheel spin	2026-02-08 20:11:39.245465
200	9	-500	bet	Wheel spin	2026-02-08 20:11:48.585081
201	9	-500	bet	Wheel spin	2026-02-08 20:11:56.567349
202	9	1000	win	Wheel win x2	2026-02-08 20:11:56.574461
203	9	-500	bet	Wheel spin	2026-02-08 20:12:07.71379
204	9	250	win	Wheel win x0.5	2026-02-08 20:12:07.719101
205	9	-500	bet	Wheel spin	2026-02-08 20:12:23.458123
206	9	-500	bet	Wheel spin	2026-02-08 20:12:31.248218
207	9	1500	win	Wheel win x3	2026-02-08 20:12:31.256776
208	9	-500	bet	Wheel spin	2026-02-08 20:12:45.238761
209	9	250	win	Wheel win x0.5	2026-02-08 20:12:45.245977
210	9	-500	bet	HiLo play	2026-02-08 20:15:15.43531
211	9	-500	bet	HiLo play	2026-02-08 20:15:21.779739
212	9	-500	bet	Wheel spin	2026-02-08 20:16:23.34811
213	9	-500	bet	Wheel spin	2026-02-08 20:16:31.026617
214	9	1000	voucher_redemption	Redeemed voucher D5064BC2	2026-02-08 20:17:38.231429
215	9	-500	bet	Wheel spin	2026-02-08 20:17:57.972122
216	9	750	win	Wheel win x1.5	2026-02-08 20:17:57.979589
217	9	-500	bet	Wheel spin	2026-02-08 20:18:09.128088
218	9	-500	bet	Wheel spin	2026-02-08 20:18:17.016224
219	9	250	win	Wheel win x0.5	2026-02-08 20:18:17.022921
220	9	-500	bet	Wheel spin	2026-02-08 20:18:27.616823
221	9	5000	voucher_redemption	Redeemed voucher BD472223	2026-02-09 17:10:39.853254
222	9	-1000	bet	Fish Hunt: Shot at scorpion_king	2026-02-09 17:11:07.319886
223	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:11:13.940533
224	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-09 17:11:21.70768
225	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-09 17:11:27.259583
226	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:11:38.409296
227	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:11:40.568761
228	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:12:13.942959
229	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-09 17:12:57.723365
230	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-09 17:13:43.312131
231	9	20000	voucher_redemption	Redeemed voucher EEC20B6C	2026-02-09 17:14:38.374951
232	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:02.672634
233	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:03.830452
234	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:05.576727
235	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:07.080863
236	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:09.41462
237	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:11.399059
238	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:30.024035
239	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:31.402021
240	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:32.694077
241	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:15:34.501679
242	9	7500	win	Fish Hunt: Caught whale (x15)	2026-02-09 17:15:34.568851
243	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:15:53.735813
244	9	2000	win	Fish Hunt: Caught turtle (x4)	2026-02-09 17:15:53.800939
245	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-09 17:16:02.851451
246	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:16:04.242793
247	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:16:08.098516
248	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:16:14.751632
249	9	-500	bet	Fish Hunt: Shot at shark	2026-02-09 17:16:19.403477
250	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-09 17:16:39.675537
251	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-09 17:16:41.45015
252	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-09 17:16:43.222185
253	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-09 17:16:43.282766
254	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-09 17:16:48.656285
255	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-09 17:16:48.720758
256	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:16:54.586651
257	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:16:56.326173
258	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:08.60473
259	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:11.232231
260	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:12.569336
261	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:13.716021
262	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:14.697923
263	9	2000	win	Fish Hunt: Caught turtle (x4)	2026-02-09 17:17:14.7638
264	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:17.903513
265	9	2000	win	Fish Hunt: Caught turtle (x4)	2026-02-09 17:17:17.968093
266	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-09 17:17:27.044317
267	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-09 17:17:29.940424
268	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-09 17:17:36.606031
269	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:44.48397
270	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:48.595275
271	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:52.738958
272	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:17:53.746484
273	9	2000	win	Fish Hunt: Caught turtle (x4)	2026-02-09 17:17:53.824772
274	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-09 17:17:57.426991
275	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-09 17:17:59.126521
276	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-09 17:18:00.691062
277	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-09 17:18:02.557915
278	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:18:17.105404
279	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:18:18.401713
280	9	2000	win	Fish Hunt: Caught turtle (x4)	2026-02-09 17:18:18.470552
281	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:18:25.020402
282	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:18:26.289431
283	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:18:28.158043
284	9	-500	bet	Fish Hunt: Shot at whale	2026-02-09 17:18:29.352025
285	9	-500	bet	Fish Hunt: Shot at mermaid	2026-02-09 17:18:46.76395
286	9	10000	win	Fish Hunt: Caught mermaid (x20)	2026-02-09 17:18:46.831395
287	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-09 17:18:59.339143
288	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:05.206892
289	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:06.620222
290	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:07.843482
291	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:08.88921
292	9	2000	win	Fish Hunt: Caught turtle (x4)	2026-02-09 17:19:08.949239
293	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-09 17:19:13.585901
294	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-09 17:19:22.060597
295	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:36.317244
296	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:37.452031
297	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:40.645956
298	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:42.018458
299	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:43.75258
300	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-09 17:19:45.143962
301	9	-500	bet	Keno: 0 hits on 1 numbers	2026-02-09 17:20:07.312552
302	9	-500	bet	Keno: 0 hits on 3 numbers	2026-02-09 17:20:15.92519
303	9	-500	bet	Poker deal	2026-02-09 17:20:28.242185
304	9	-500	bet	Poker deal	2026-02-09 17:20:43.595511
305	9	1000	win	Poker win	2026-02-09 17:20:53.024754
306	9	-500	bet	Poker deal	2026-02-09 17:21:00.433098
307	9	1000	win	Poker win	2026-02-09 17:21:05.920411
308	9	-500	bet	Poker deal	2026-02-09 17:21:16.19443
309	9	1000	win	Poker win	2026-02-09 17:21:25.827721
310	9	1000	win	Poker win	2026-02-09 17:21:26.14572
311	9	-500	bet	Poker deal	2026-02-09 17:21:31.85467
312	9	1000	win	Poker win	2026-02-09 17:21:33.986653
313	9	-500	bet	Poker deal	2026-02-09 17:21:35.024849
314	9	1000	win	Poker win	2026-02-09 17:21:42.77718
315	9	-500	bet	Poker deal	2026-02-09 17:21:48.052548
316	9	1000	win	Poker win	2026-02-09 17:22:06.049425
317	9	-500	bet	Poker deal	2026-02-09 17:22:06.865431
318	9	-500	bet	Poker deal	2026-02-09 17:22:06.888595
319	9	-500	bet	Poker deal	2026-02-09 17:22:06.980189
320	9	1000	win	Poker win	2026-02-09 17:22:08.798969
321	9	-500	bet	Wheel spin	2026-02-09 17:22:27.977904
322	9	-500	bet	Wheel spin	2026-02-09 17:22:36.84573
323	9	-500	bet	Wheel spin	2026-02-09 17:22:45.748654
324	9	250	win	Wheel win x0.5	2026-02-09 17:22:45.809411
325	9	-500	bet	Wheel spin	2026-02-09 17:23:00.344551
326	9	-500	bet	Wheel spin	2026-02-09 17:23:08.39338
327	9	500	win	Wheel win x1	2026-02-09 17:23:08.455256
328	9	-500	bet	Wheel spin	2026-02-09 17:23:17.61339
329	9	500	win	Wheel win x1	2026-02-09 17:23:17.68114
330	9	-500	bet	Wheel spin	2026-02-09 17:23:26.835365
331	9	-500	bet	Wheel spin	2026-02-09 17:23:37.712561
332	9	250	win	Wheel win x0.5	2026-02-09 17:23:37.777991
333	9	-500	bet	Wheel spin	2026-02-09 17:23:48.882623
334	9	250	win	Wheel win x0.5	2026-02-09 17:23:48.949171
335	9	-500	bet	Wheel spin	2026-02-09 17:24:08.71083
336	9	-500	bet	Wheel spin	2026-02-09 17:24:17.429027
337	9	-500	bet	Wheel spin	2026-02-09 17:24:29.390238
338	9	-500	bet	Wheel spin	2026-02-09 17:24:37.205958
339	9	-500	bet	Wheel spin	2026-02-09 17:24:44.546423
340	9	-500	bet	Wheel spin	2026-02-09 17:24:52.14555
341	9	-500	bet	Wheel spin	2026-02-09 17:25:01.464562
342	9	1500	win	Wheel win x3	2026-02-09 17:25:01.531304
343	9	-500	bet	Wheel spin	2026-02-09 17:25:11.892042
344	9	1000	win	Wheel win x2	2026-02-09 17:25:11.956158
345	9	-500	bet	Wheel spin	2026-02-09 17:25:26.424132
346	9	-500	bet	Wheel spin	2026-02-09 17:25:36.944967
347	9	-500	bet	Wheel spin	2026-02-09 17:25:44.114962
348	9	-500	bet	Wheel spin	2026-02-09 17:25:56.018413
349	9	500	win	Wheel win x1	2026-02-09 17:25:56.078135
350	9	-500	bet	Wheel spin	2026-02-09 17:26:05.306003
351	9	-500	bet	Wheel spin	2026-02-09 17:26:16.891039
352	9	250	win	Wheel win x0.5	2026-02-09 17:26:16.959144
353	9	-500	bet	Wheel spin	2026-02-09 17:26:27.521988
354	9	250	win	Wheel win x0.5	2026-02-09 17:26:27.58476
355	9	-500	bet	Wheel spin	2026-02-09 17:26:36.854342
356	9	-500	bet	Wheel spin	2026-02-09 17:26:47.474635
357	9	-500	bet	Wheel spin	2026-02-09 17:27:08.18565
358	9	250	win	Wheel win x0.5	2026-02-09 17:27:08.253496
359	9	-500	bet	Wheel spin	2026-02-09 17:27:17.398452
360	9	1500	win	Wheel win x3	2026-02-09 17:27:17.46692
361	9	-500	bet	Wheel spin	2026-02-09 17:27:31.320252
362	9	1500	win	Wheel win x3	2026-02-09 17:27:31.385008
363	9	-500	bet	Wheel spin	2026-02-09 17:27:42.91393
364	9	250	win	Wheel win x0.5	2026-02-09 17:27:42.980389
365	9	-500	bet	Wheel spin	2026-02-09 17:29:50.19648
366	9	-500	bet	Wheel spin	2026-02-09 17:58:19.997515
367	9	-500	bet	Mines play	2026-02-09 17:58:43.74189
368	9	800	win	Mines win	2026-02-09 17:58:43.805167
369	9	-500	bet	Mines play	2026-02-09 17:58:48.290663
370	9	1100	win	Mines win	2026-02-09 17:58:48.357732
371	9	-500	bet	Mines play	2026-02-09 17:58:51.378241
372	9	1400	win	Mines win	2026-02-09 17:58:51.443002
373	9	-500	bet	Mines play	2026-02-09 17:58:53.812018
374	9	-500	bet	Mines play	2026-02-09 17:59:05.450571
375	9	800	win	Mines win	2026-02-09 17:59:05.517372
376	9	-500	bet	Mines play	2026-02-09 17:59:07.562865
377	9	1100	win	Mines win	2026-02-09 17:59:07.625635
378	9	-500	bet	Mines play	2026-02-09 17:59:09.915261
379	9	1400	win	Mines win	2026-02-09 17:59:09.979799
380	9	-500	bet	Mines play	2026-02-09 17:59:12.204233
381	9	1700	win	Mines win	2026-02-09 17:59:12.266379
382	9	-500	bet	Mines play	2026-02-09 17:59:14.761016
383	9	-500	bet	Mines play	2026-02-09 17:59:19.003472
384	9	800	win	Mines win	2026-02-09 17:59:19.064788
385	9	-500	bet	Mines play	2026-02-09 17:59:21.393334
386	9	1100	win	Mines win	2026-02-09 17:59:21.45876
387	9	-500	bet	Mines play	2026-02-09 17:59:23.281617
388	9	1400	win	Mines win	2026-02-09 17:59:23.342092
389	9	-500	bet	Mines play	2026-02-09 17:59:25.241935
390	9	1700	win	Mines win	2026-02-09 17:59:25.307099
391	9	-500	bet	Mines play	2026-02-09 17:59:27.234631
392	9	2000	win	Mines win	2026-02-09 17:59:27.297528
393	9	-500	bet	Mines play	2026-02-09 17:59:29.971699
394	9	2300	win	Mines win	2026-02-09 17:59:30.036805
395	9	-500	bet	Mines play	2026-02-09 17:59:32.871252
396	9	2600	win	Mines win	2026-02-09 17:59:32.93368
397	9	-500	bet	Mines play	2026-02-09 17:59:35.371917
398	9	2900	win	Mines win	2026-02-09 17:59:35.438656
399	9	-500	bet	Mines play	2026-02-09 17:59:38.371684
400	9	3200	win	Mines win	2026-02-09 17:59:38.436871
401	9	-500	bet	Mines play	2026-02-09 17:59:40.89422
402	9	3500	win	Mines win	2026-02-09 17:59:40.963545
403	9	-500	bet	Mines play	2026-02-09 17:59:43.430812
404	9	3800	win	Mines win	2026-02-09 17:59:43.492032
405	9	-500	bet	Mines play	2026-02-09 17:59:46.144267
406	9	-500	bet	Mines play	2026-02-09 17:59:53.805766
407	9	800	win	Mines win	2026-02-09 17:59:53.866062
408	9	-500	bet	Plinko play	2026-02-09 18:00:22.503803
409	9	2500	win	Plinko win	2026-02-09 18:00:22.578063
410	9	-500	bet	Plinko play	2026-02-09 18:00:31.570859
411	9	100	win	Plinko win	2026-02-09 18:00:31.633058
412	9	-500	bet	Plinko play	2026-02-09 18:00:40.633529
413	9	250	win	Plinko win	2026-02-09 18:00:40.702865
414	9	-500	bet	Plinko play	2026-02-09 18:02:08.882908
415	9	1000	win	Plinko win	2026-02-09 18:02:08.957687
416	9	-500	bet	Plinko play	2026-02-09 18:02:19.534144
417	9	2500	win	Plinko win	2026-02-09 18:02:19.649726
418	9	-500	bet	Plinko play	2026-02-09 18:02:25.894327
419	9	1000	win	Plinko win	2026-02-09 18:02:25.954211
420	9	-500	bet	Plinko play	2026-02-09 18:02:31.469218
421	9	250	win	Plinko win	2026-02-09 18:02:31.53557
422	9	-500	bet	Plinko play	2026-02-09 18:02:36.911929
423	9	100	win	Plinko win	2026-02-09 18:02:36.972368
424	9	-500	bet	Plinko play	2026-02-09 18:02:44.647469
425	9	600	win	Plinko win	2026-02-09 18:02:44.715325
426	9	-500	bet	Plinko play	2026-02-09 18:02:49.91466
427	9	250	win	Plinko win	2026-02-09 18:02:49.976329
428	9	-500	bet	Plinko play	2026-02-09 18:02:55.032739
429	9	250	win	Plinko win	2026-02-09 18:02:55.101323
430	9	-500	bet	Plinko play	2026-02-09 18:03:00.548681
431	9	100	win	Plinko win	2026-02-09 18:03:00.609011
432	9	-500	bet	Plinko play	2026-02-09 18:03:06.517562
433	9	1000	win	Plinko win	2026-02-09 18:03:06.585956
434	9	-500	bet	Plinko play	2026-02-09 18:11:39.897855
435	9	600	win	Plinko win	2026-02-09 18:11:39.978552
436	9	-500	bet	Plinko play	2026-02-09 18:11:47.065761
437	9	250	win	Plinko win	2026-02-09 18:11:47.139277
438	9	-500	bet	Plinko play	2026-02-09 18:11:59.34742
439	9	100	win	Plinko win	2026-02-09 18:11:59.416309
440	9	-500	bet	Coin Flip play	2026-02-09 18:12:33.687304
441	9	975	win	Coin Flip win	2026-02-09 18:12:33.747637
442	9	-500	bet	Coin Flip play	2026-02-09 18:12:42.114615
443	9	975	win	Coin Flip win	2026-02-09 18:12:42.178489
444	9	-500	bet	Coin Flip play	2026-02-09 18:12:46.683211
445	9	-500	bet	Coin Flip play	2026-02-09 18:12:51.186926
446	9	975	win	Coin Flip win	2026-02-09 18:12:51.251505
447	9	-500	bet	Coin Flip play	2026-02-09 18:12:56.643091
448	9	975	win	Coin Flip win	2026-02-09 18:12:56.704125
449	9	-500	bet	Coin Flip play	2026-02-09 18:13:02.417342
450	9	975	win	Coin Flip win	2026-02-09 18:13:02.48225
451	9	-500	bet	Coin Flip play	2026-02-09 18:13:14.265455
452	9	-500	bet	Coin Flip play	2026-02-09 18:13:19.607655
453	9	975	win	Coin Flip win	2026-02-09 18:13:19.671206
456	9	-500	bet	Coin Flip play	2026-02-09 18:13:28.885756
458	9	-500	bet	Coin Flip play	2026-02-09 18:13:37.669688
461	9	-500	bet	Coin Flip play	2026-02-09 18:13:50.202246
1218	9	-500	bet	Wheel spin	2026-02-24 18:23:30.172603
1220	9	-500	bet	Wheel spin	2026-02-24 18:23:53.585703
1221	9	250	win	Wheel win x0.5	2026-02-24 18:23:53.650725
1224	9	-500	bet	Wheel spin	2026-02-24 18:24:39.113
1225	9	250	win	Wheel win x0.5	2026-02-24 18:24:39.182733
1229	9	-500	bet	Wheel spin	2026-02-24 18:25:16.649711
1230	9	750	win	Wheel win x1.5	2026-02-24 18:25:16.716167
1234	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-24 18:26:08.267125
1238	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-24 18:26:28.106033
1240	9	-500	bet	Fish Hunt: Shot at shark	2026-02-24 18:26:34.315775
1242	9	-500	bet	Fish Hunt: Shot at shark	2026-02-24 18:26:37.650265
1244	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-24 18:26:45.176769
1245	9	2500	win	Fish Hunt: Caught pufferfish (x5)	2026-02-24 18:26:45.241971
1247	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-24 18:26:52.869306
1249	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-24 18:26:56.847672
1251	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-24 18:27:00.573199
1254	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-24 18:27:19.00167
1256	9	-500	bet	Fish Hunt: Shot at shark	2026-02-24 18:27:31.421738
1257	9	-500	bet	Fish Hunt: Shot at shark	2026-02-24 18:27:32.762392
1264	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:27:56.673897
1266	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:27:59.152032
1268	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:28:01.526331
1270	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:28:04.220028
1273	26	-500	bet	Fish Hunt: Shot at octopus	2026-02-25 15:19:41.833437
1274	26	4000	win	Fish Hunt: Caught octopus (x8)	2026-02-25 15:19:41.903619
1279	9	-500	bet	Slots spin	2026-02-27 17:28:55.54311
1280	9	1750	win	Slots win	2026-02-27 17:28:55.612153
1284	9	-500	bet	Slots spin	2026-02-27 17:29:19.179063
1287	9	-500	bet	Slots spin	2026-02-27 17:29:39.474019
1288	9	1750	win	Slots win	2026-02-27 17:29:39.55355
1293	9	-1000	bet	Slots spin	2026-02-27 17:32:20.337887
1294	9	2500	win	Slots win	2026-02-27 17:32:20.399751
1298	9	-1000	bet	Slots spin	2026-02-27 17:32:42.071204
1299	9	-1000	bet	Slots spin	2026-02-27 17:32:48.749088
1300	9	-1000	bet	Slots spin	2026-02-27 17:32:53.307402
1301	9	2500	win	Slots win	2026-02-27 17:32:53.371824
1305	9	-1000	bet	Slots spin	2026-02-27 17:33:15.826131
1306	9	2500	win	Slots win	2026-02-27 17:33:15.892125
1308	9	-1000	bet	Slots spin	2026-02-27 17:33:27.793602
1309	9	-1000	bet	Slots spin	2026-02-27 17:33:32.86926
1312	9	-1000	bet	Slots spin	2026-02-27 17:33:43.876246
1313	9	2500	win	Slots win	2026-02-27 17:33:43.937689
1314	9	-1000	bet	Slots spin	2026-02-27 17:33:50.135084
1316	9	-2000	bet	Classic Slots spin	2026-02-27 17:35:31.391341
1319	9	-2000	bet	Classic Slots spin	2026-02-27 17:36:01.448306
1321	9	-2000	bet	Classic Slots spin	2026-02-27 17:36:25.472026
1323	9	-2000	bet	Classic Slots spin	2026-02-27 17:36:30.493132
1327	9	-10000	bet	Classic Slots spin	2026-02-27 17:37:31.092393
1329	9	-10000	bet	Classic Slots spin	2026-02-27 17:37:47.204944
1331	9	4000	win	Classic Slots win	2026-02-27 17:37:59.030607
1333	9	8200	win	Classic Slots win	2026-02-27 17:38:25.506642
1336	9	-2000	bet	Classic Slots spin	2026-02-27 17:38:55.873279
1338	9	-2000	bet	Classic Slots spin	2026-02-27 17:39:16.166003
1341	9	-500	bet	HiLo play	2026-02-27 17:40:00.674094
1343	9	-500	bet	HiLo play	2026-02-27 17:40:09.803032
1345	9	-500	bet	HiLo play	2026-02-27 17:40:20.375892
1347	9	-500	bet	HiLo play	2026-02-27 17:41:03.272939
1348	9	2500	win	HiLo win	2026-02-27 17:41:03.337238
1350	9	-500	bet	HiLo play	2026-02-27 17:41:20.032927
1351	9	2500	win	HiLo win	2026-02-27 17:41:20.099297
1354	9	-500	bet	HiLo play	2026-02-27 17:41:31.261458
1356	9	-500	bet	HiLo play	2026-02-27 17:42:33.390925
1358	9	-500	bet	HiLo play	2026-02-27 17:42:49.164037
1361	9	-500	bet	HiLo play	2026-02-27 17:43:04.411398
1362	9	2500	win	HiLo win	2026-02-27 17:43:04.480145
1364	9	-500	bet	HiLo play	2026-02-27 17:43:16.944566
1366	9	-500	bet	HiLo play	2026-02-27 17:43:28.257265
1368	9	-500	bet	HiLo play	2026-02-27 17:43:37.226379
1370	9	-500	bet	HiLo play	2026-02-27 17:43:44.79966
1372	9	-500	bet	HiLo play	2026-02-27 17:43:59.165958
1373	9	2500	win	HiLo win	2026-02-27 17:43:59.233697
1375	9	-500	bet	HiLo play	2026-02-27 17:44:09.049716
1378	9	-500	bet	HiLo play	2026-02-27 17:44:20.179275
1380	9	-500	bet	HiLo play	2026-02-27 17:44:31.526278
1382	9	-500	bet	HiLo play	2026-02-27 17:44:45.260665
1383	9	2500	win	HiLo win	2026-02-27 17:44:45.328182
1385	9	-500	bet	HiLo play	2026-02-27 17:44:52.118523
1387	9	-500	bet	HiLo play	2026-02-27 17:44:58.723896
1388	9	2500	win	HiLo win	2026-02-27 17:44:58.792731
1390	9	-500	bet	HiLo play	2026-02-27 17:45:06.802471
1391	9	2500	win	HiLo win	2026-02-27 17:45:06.873043
1394	9	-500	bet	HiLo play	2026-02-27 17:45:13.389927
1396	9	-500	bet	HiLo play	2026-02-27 17:45:30.327744
1399	9	-500	bet	Roulette spin	2026-02-27 17:46:14.662957
1401	9	-500	bet	Roulette spin	2026-02-27 17:46:46.068072
1403	9	-500	bet	Roulette spin	2026-02-27 17:47:09.389146
1405	9	-1000	bet	Roulette spin	2026-02-27 17:47:44.760554
1407	9	-1000	bet	Roulette spin	2026-02-27 17:48:18.035054
1408	9	35000	win	Roulette win	2026-02-27 17:48:18.101908
1410	9	-5000	bet	Roulette spin	2026-02-27 17:48:47.351228
1412	9	-5000	bet	Roulette spin	2026-02-27 17:49:13.186295
1414	9	-5000	bet	Roulette spin	2026-02-27 17:49:52.521797
1416	9	-500	bet	Dice roll	2026-02-27 17:51:08.568684
1417	9	1500	win	Dice win	2026-02-27 17:51:08.630507
1420	9	-500	bet	Dice roll	2026-02-27 17:51:26.642705
1421	9	1500	win	Dice win	2026-02-27 17:51:26.713842
1423	9	-500	bet	Dice roll	2026-02-27 17:51:40.811302
1425	9	-500	bet	Dice roll	2026-02-27 17:51:53.245793
1427	9	-500	bet	Coin Flip play	2026-02-27 17:52:59.795064
1431	9	-500	bet	Coin Flip play	2026-02-27 17:53:29.871796
1433	9	-500	bet	Coin Flip play	2026-02-27 17:53:58.562902
1434	9	-500	bet	Coin Flip play	2026-02-27 17:54:05.901258
1435	9	1250	win	Coin Flip win	2026-02-27 17:54:05.962473
1437	9	-500	bet	Coin Flip play	2026-02-27 17:54:33.733421
1440	9	-500	bet	Plinko play	2026-02-27 17:55:13.222614
1441	9	600	win	Plinko win	2026-02-27 17:55:13.282559
1444	9	-500	bet	Plinko play	2026-02-27 17:55:28.932206
1445	9	250	win	Plinko win	2026-02-27 17:55:28.993696
1450	9	-500	bet	Plinko play	2026-02-27 17:56:33.198013
1451	9	100	win	Plinko win	2026-02-27 17:56:33.264493
454	9	-500	bet	Coin Flip play	2026-02-09 18:13:24.503612
455	9	975	win	Coin Flip win	2026-02-09 18:13:24.570279
457	9	-500	bet	Coin Flip play	2026-02-09 18:13:33.831421
459	9	-500	bet	Coin Flip play	2026-02-09 18:13:42.240114
460	9	975	win	Coin Flip win	2026-02-09 18:13:42.306267
462	9	-20000	bet	Coin Flip play	2026-02-09 18:13:56.4423
463	9	-5000	bet	Coin Flip play	2026-02-09 18:14:07.671661
464	9	9750	win	Coin Flip win	2026-02-09 18:14:07.734815
465	9	-1000	bet	HiLo play	2026-02-09 18:14:49.682053
466	9	2000	win	HiLo win	2026-02-09 18:14:49.74438
467	9	-1000	bet	HiLo play	2026-02-09 18:14:57.291228
468	9	-1000	bet	HiLo play	2026-02-09 18:15:02.104912
469	9	-1000	bet	HiLo play	2026-02-09 18:15:05.001975
470	9	2000	win	HiLo win	2026-02-09 18:15:05.064655
471	9	-1000	bet	HiLo play	2026-02-09 18:15:08.38722
472	9	2000	win	HiLo win	2026-02-09 18:15:08.471275
473	9	-1000	bet	HiLo play	2026-02-09 18:15:16.694148
474	9	2000	win	HiLo win	2026-02-09 18:15:16.799442
475	9	-1000	bet	HiLo play	2026-02-09 18:15:22.740385
476	9	2000	win	HiLo win	2026-02-09 18:15:22.804305
477	9	-1000	bet	Dice roll	2026-02-09 18:15:47.901622
478	9	-1000	bet	Dice roll	2026-02-09 18:15:56.037209
479	9	-1000	bet	Dice roll	2026-02-09 18:16:04.664445
480	9	2000	win	Dice win	2026-02-09 18:16:04.726954
481	9	-1000	bet	Dice roll	2026-02-09 18:16:11.942452
482	9	-1000	bet	Dice roll	2026-02-09 18:16:20.034573
483	9	2000	win	Dice win	2026-02-09 18:16:20.094177
484	9	-1000	bet	Dice roll	2026-02-09 18:16:25.710154
485	9	-1000	bet	Dice roll	2026-02-09 18:16:32.292416
486	9	-500	bet	Roulette spin	2026-02-09 18:17:07.275267
487	9	17500	win	Roulette win	2026-02-09 18:17:07.338222
488	9	-500	bet	Roulette spin	2026-02-09 18:17:37.795016
489	9	-5000	bet	Roulette spin	2026-02-09 18:17:47.157039
490	9	-5000	bet	Roulette spin	2026-02-09 18:18:01.037327
491	9	-5000	bet	Roulette spin	2026-02-09 18:18:14.3103
492	9	10000	win	Roulette win	2026-02-09 18:18:14.376306
493	9	-20000	bet	Roulette spin	2026-02-09 18:18:50.527218
494	9	-500	bet	Slots spin	2026-02-09 18:19:31.304943
495	9	-500	bet	Slots spin	2026-02-09 18:19:34.794412
496	9	-500	bet	Slots spin	2026-02-09 18:19:40.612516
497	9	-500	bet	Slots spin	2026-02-09 18:19:44.419123
498	9	-500	bet	Slots spin	2026-02-09 18:19:57.325356
499	9	-500	bet	Slots spin	2026-02-09 18:20:05.531622
500	9	5000	win	Slots win	2026-02-09 18:20:05.600229
501	9	-500	bet	Slots spin	2026-02-09 18:20:14.75392
502	9	5000	win	Slots win	2026-02-09 18:20:14.821528
503	9	-500	bet	Slots spin	2026-02-09 18:20:34.178665
504	9	-500	bet	Slots spin	2026-02-09 18:20:46.796254
505	9	5000	win	Slots win	2026-02-09 18:20:46.858823
506	9	-500	bet	Slots spin	2026-02-09 18:40:02.662008
507	9	5000	win	Slots win	2026-02-09 18:40:02.742614
508	9	-500	bet	Slots spin	2026-02-09 18:40:12.991625
509	9	-500	bet	Slots spin	2026-02-09 18:40:16.804182
510	9	-500	bet	Slots spin	2026-02-09 18:40:20.188596
511	9	-500	bet	Slots spin	2026-02-09 18:40:23.514052
512	9	5000	win	Slots win	2026-02-09 18:40:23.583476
513	9	-500	bet	Slots spin	2026-02-09 18:40:29.409976
514	9	-500	bet	Slots spin	2026-02-09 18:40:32.892507
515	9	-500	bet	Slots spin	2026-02-09 18:40:36.234449
516	9	-500	bet	Slots spin	2026-02-09 18:40:41.873809
517	9	5000	win	Slots win	2026-02-09 18:40:41.955075
518	9	-500	bet	Slots spin	2026-02-09 18:40:48.496401
519	9	-500	bet	Slots spin	2026-02-09 18:40:52.527047
520	9	-10000	bet	Slots spin	2026-02-09 18:40:59.333951
521	9	-10000	bet	Slots spin	2026-02-09 18:41:07.092315
522	9	100000	win	Slots win	2026-02-09 18:41:07.159531
523	9	-50000	bet	Slots spin	2026-02-09 18:41:19.409923
524	9	-50000	bet	Slots spin	2026-02-09 18:41:22.133821
525	9	-500	bet	Slots spin	2026-02-09 18:41:27.490767
526	9	-500	bet	Slots spin	2026-02-09 18:41:33.19414
527	9	-500	bet	Slots spin	2026-02-09 18:41:37.488365
528	9	-500	bet	Slots spin	2026-02-09 18:41:41.461417
529	9	-500	bet	Slots spin	2026-02-09 18:41:47.275689
530	9	5000	win	Slots win	2026-02-09 18:41:47.335803
531	9	-500	bet	Mines play	2026-02-09 19:38:11.408761
532	9	-500	bet	Mines play	2026-02-09 19:38:11.45394
533	9	1100	win	Mines win	2026-02-09 19:38:11.521456
534	9	-500	bet	Mines play	2026-02-09 19:38:21.479965
535	9	-500	bet	Mines play	2026-02-09 19:38:27.891238
536	9	800	win	Mines win	2026-02-09 19:38:27.959479
537	9	-500	bet	Mines play	2026-02-09 19:38:34.598951
538	9	-500	bet	Mines play	2026-02-09 19:38:36.949222
539	9	-500	bet	Mines play	2026-02-09 19:38:47.208061
540	9	-500	bet	Mines play	2026-02-09 19:38:52.938166
541	9	-500	bet	Mines play	2026-02-09 19:39:01.021593
542	9	-500	bet	Mines play	2026-02-09 19:39:07.111057
543	9	-500	bet	Mines play	2026-02-09 19:39:10.074869
544	9	-500	bet	Mines play	2026-02-09 19:39:20.581346
545	9	-500	bet	Mines play	2026-02-09 19:39:29.420726
546	9	800	win	Mines win	2026-02-09 19:39:29.483494
547	9	-500	bet	Mines play	2026-02-09 19:39:40.193795
548	9	800	win	Mines win	2026-02-09 19:39:40.26495
549	9	-500	bet	Mines play	2026-02-09 19:39:50.713778
550	9	-500	bet	Mines play	2026-02-09 19:39:57.054642
551	9	-500	bet	Slots spin	2026-02-09 19:40:10.67698
552	9	-500	bet	Slots spin	2026-02-09 19:40:16.043855
553	9	-500	bet	Slots spin	2026-02-09 19:40:19.06355
554	9	-500	bet	Slots spin	2026-02-09 19:40:22.057309
555	9	-500	bet	Slots spin	2026-02-09 19:40:24.846187
556	9	-500	bet	Slots spin	2026-02-09 19:40:28.097715
557	9	-500	bet	Slots spin	2026-02-09 19:40:31.088016
558	9	-500	bet	Slots spin	2026-02-09 19:40:33.836648
559	9	-500	bet	Slots spin	2026-02-09 19:40:39.526978
560	9	5000	win	Slots win	2026-02-09 19:40:39.592121
561	9	-500	bet	Slots spin	2026-02-09 19:40:44.891974
562	9	-500	bet	Slots spin	2026-02-09 19:40:51.635667
563	9	-500	bet	Slots spin	2026-02-09 19:40:55.251525
564	9	-500	bet	Slots spin	2026-02-09 19:41:00.551457
565	9	-500	bet	Slots spin	2026-02-09 19:41:04.190901
566	9	-500	bet	Slots spin	2026-02-09 19:41:07.72832
567	9	-500	bet	Slots spin	2026-02-09 19:41:14.175252
568	9	-500	bet	Slots spin	2026-02-09 19:41:17.344681
569	9	5000	win	Slots win	2026-02-09 19:41:17.410052
570	9	-500	bet	Slots spin	2026-02-09 19:41:23.332133
571	9	-500	bet	Roulette spin	2026-02-09 19:41:44.730995
572	9	-500	bet	Roulette spin	2026-02-09 19:41:55.406219
573	9	-500	bet	Roulette spin	2026-02-09 19:42:08.900044
574	9	-500	bet	Roulette spin	2026-02-09 19:42:22.403663
575	9	-500	bet	Roulette spin	2026-02-09 19:42:34.864747
576	9	-500	bet	Roulette spin	2026-02-09 19:42:42.763823
577	9	-500	bet	Dice roll	2026-02-09 19:43:09.563778
578	9	-500	bet	Dice roll	2026-02-09 19:43:18.585426
579	9	-500	bet	Dice roll	2026-02-09 19:43:25.275366
580	9	-500	bet	Dice roll	2026-02-09 19:43:33.582702
581	9	-500	bet	Dice roll	2026-02-09 19:43:44.277975
582	9	-500	bet	HiLo play	2026-02-09 19:44:00.899938
583	9	-500	bet	HiLo play	2026-02-09 19:44:08.245821
584	9	-500	bet	HiLo play	2026-02-09 19:44:14.919134
585	9	-500	bet	HiLo play	2026-02-09 19:44:23.367463
586	9	-500	bet	HiLo play	2026-02-09 19:44:31.286707
587	9	-500	bet	HiLo play	2026-02-09 19:44:34.230908
588	9	-500	bet	HiLo play	2026-02-09 19:44:37.426489
589	9	-500	bet	HiLo play	2026-02-09 19:44:46.284236
590	9	1000	win	HiLo win	2026-02-09 19:44:46.349268
591	9	-500	bet	HiLo play	2026-02-09 19:44:52.597516
592	9	-500	bet	HiLo play	2026-02-09 19:44:59.230932
593	9	-500	bet	HiLo play	2026-02-09 19:45:02.088385
594	9	-500	bet	HiLo play	2026-02-09 19:45:04.71909
595	9	-500	bet	HiLo play	2026-02-09 19:45:09.6749
596	9	-500	bet	HiLo play	2026-02-09 19:45:12.746146
597	9	-500	bet	Coin Flip play	2026-02-09 19:45:35.735605
598	9	-500	bet	Coin Flip play	2026-02-09 19:45:41.740851
599	9	-500	bet	Coin Flip play	2026-02-09 19:45:46.961584
600	9	-500	bet	Coin Flip play	2026-02-09 19:45:52.400368
601	9	-500	bet	Plinko play	2026-02-09 19:46:44.64566
602	9	100	win	Plinko win	2026-02-09 19:46:44.712273
603	9	-500	bet	Plinko play	2026-02-09 19:46:49.155462
604	9	250	win	Plinko win	2026-02-09 19:46:49.216048
605	9	-500	bet	Plinko play	2026-02-09 19:46:54.538983
606	9	100	win	Plinko win	2026-02-09 19:46:54.602107
607	9	-500	bet	Plinko play	2026-02-09 19:47:03.83393
608	9	100	win	Plinko win	2026-02-09 19:47:03.893416
609	9	-500	bet	Plinko play	2026-02-09 19:47:15.835951
610	9	250	win	Plinko win	2026-02-09 19:47:15.90127
611	9	-500	bet	Plinko play	2026-02-09 19:47:27.523925
612	9	250	win	Plinko win	2026-02-09 19:47:27.590743
613	9	-500	bet	Wheel spin	2026-02-09 19:48:26.176116
614	9	-500	bet	Wheel spin	2026-02-09 19:48:34.725217
615	9	-500	bet	Wheel spin	2026-02-09 19:48:42.536231
616	9	-500	bet	Wheel spin	2026-02-09 19:48:50.696698
617	9	-500	bet	Wheel spin	2026-02-09 19:48:59.227773
618	9	2500	win	Wheel win x5	2026-02-09 19:48:59.291376
619	9	-500	bet	Wheel spin	2026-02-09 19:49:26.131653
620	9	-500	bet	Wheel spin	2026-02-09 19:49:33.786721
621	9	-500	bet	Wheel spin	2026-02-09 19:49:42.576848
622	9	-500	bet	Wheel spin	2026-02-09 19:49:53.243527
623	9	-500	bet	Wheel spin	2026-02-09 19:50:11.559844
624	9	-500	bet	Poker deal	2026-02-09 19:50:31.250759
625	9	-500	bet	Poker deal	2026-02-09 19:51:01.925144
626	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-09 19:52:27.277213
627	13	1000	voucher_redemption	Guest login with voucher 390ED61C	2026-02-09 20:42:21.195564
628	13	-500	bet	Wheel spin	2026-02-09 20:42:36.507417
629	13	-500	bet	Wheel spin	2026-02-09 20:42:45.329834
630	12	1000	voucher_redemption	Redeemed voucher 9E6D0824	2026-02-09 20:45:15.12152
631	12	-500	bet	Wheel spin	2026-02-09 20:45:29.777951
632	12	-500	bet	Wheel spin	2026-02-09 20:45:37.451516
633	14	1500	voucher_redemption	Guest login with voucher A192BB5C	2026-02-09 21:21:55.69827
634	14	-1000	bet	Fish Hunt: Shot at octopus	2026-02-09 21:22:52.874922
635	14	-500	bet	Coin Flip play	2026-02-09 21:23:06.55823
636	12	500	voucher_redemption	Redeemed voucher 3DE050BD	2026-02-09 21:24:42.444906
637	12	-500	bet	Slots spin	2026-02-09 21:24:51.227938
638	9	2000	voucher_redemption	Redeemed voucher 8E2A9964	2026-02-11 20:18:53.04637
639	9	-500	bet	Coin Flip play	2026-02-11 20:19:23.413506
640	9	-500	bet	Coin Flip play	2026-02-11 20:19:29.454845
641	9	-500	bet	Coin Flip play	2026-02-11 20:19:35.035327
642	9	975	win	Coin Flip win	2026-02-11 20:19:35.096812
643	9	-500	bet	Coin Flip play	2026-02-11 20:19:42.275566
644	9	-500	bet	Coin Flip play	2026-02-11 20:19:47.702512
645	9	-500	bet	Coin Flip play	2026-02-11 20:20:25.896822
646	15	5000	voucher_redemption	Guest login with voucher 37C87E2F	2026-02-12 08:30:48.155686
647	15	-500	bet	Fish Hunt: Shot at small_fish	2026-02-12 08:31:42.668069
648	15	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-12 08:31:42.732438
649	15	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-12 08:31:51.446702
650	15	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-12 08:31:54.085364
651	15	1500	win	Fish Hunt: Caught medium_fish (x3)	2026-02-12 08:31:54.14904
652	15	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-12 08:32:03.27368
653	15	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-12 08:32:07.41156
654	15	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-12 08:32:09.57908
655	15	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-12 08:32:11.679174
656	15	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-12 08:32:13.956666
657	15	-500	bet	Fish Hunt: Shot at whale	2026-02-12 08:32:26.082737
658	15	-500	bet	Fish Hunt: Shot at whale	2026-02-12 08:32:27.515903
659	15	-500	bet	Fish Hunt: Shot at whale	2026-02-12 08:32:29.357631
660	15	-500	bet	Fish Hunt: Shot at whale	2026-02-12 08:32:31.312307
661	15	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-12 08:32:33.598876
662	15	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-12 08:32:36.082456
663	15	1500	win	Fish Hunt: Caught medium_fish (x3)	2026-02-12 08:32:36.155492
664	15	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-12 08:33:01.267812
665	15	-500	bet	Fish Hunt: Shot at mermaid	2026-02-12 08:33:03.272626
666	15	-500	bet	Fish Hunt: Shot at mermaid	2026-02-12 08:33:05.671697
667	15	-500	bet	Fish Hunt: Shot at small_fish	2026-02-12 08:33:09.619148
668	16	5000	voucher_redemption	Guest login with voucher C419CDB3	2026-02-12 14:04:16.756112
669	16	-500	bet	Slots spin	2026-02-12 14:04:45.348546
670	16	-500	bet	Roulette spin	2026-02-12 14:05:21.440316
671	16	-500	bet	Dice roll	2026-02-12 14:05:53.030089
672	16	-500	bet	Dice roll	2026-02-12 14:06:00.311985
673	16	-500	bet	HiLo play	2026-02-12 14:06:26.786888
674	16	-500	bet	Coin Flip play	2026-02-12 14:06:59.046079
675	16	-500	bet	Plinko play	2026-02-12 14:08:01.408493
676	16	250	win	Plinko win	2026-02-12 14:08:01.46942
677	16	-500	bet	Wheel spin	2026-02-12 14:08:44.267636
678	16	-500	bet	Wheel spin	2026-02-12 14:08:56.582569
679	16	-500	bet	Poker deal	2026-02-12 14:09:34.088258
680	18	3000	voucher_redemption	Redeemed voucher A9DB41EA	2026-02-12 20:03:14.875038
681	18	-500	bet	Wheel spin	2026-02-12 20:03:44.411047
682	18	500	win	Wheel win x1	2026-02-12 20:03:44.48037
683	18	-500	bet	Wheel spin	2026-02-12 20:04:05.156232
684	18	-500	bet	Wheel spin	2026-02-12 20:04:15.210412
685	18	-500	bet	Wheel spin	2026-02-12 20:04:31.264693
686	18	500	win	Wheel win x1	2026-02-12 20:04:31.330268
687	18	-500	bet	Wheel spin	2026-02-12 20:04:43.473995
688	18	-500	bet	Wheel spin	2026-02-12 20:04:57.205094
689	18	-500	bet	Wheel spin	2026-02-12 20:05:07.838486
690	18	500	win	Wheel win x1	2026-02-12 20:05:07.900291
691	18	-500	bet	Wheel spin	2026-02-12 20:05:18.990796
692	18	-500	bet	Wheel spin	2026-02-12 20:05:30.05975
693	18	250	win	Wheel win x0.5	2026-02-12 20:05:30.124908
694	9	5000	voucher_redemption	Redeemed voucher DAF5C257	2026-02-15 14:27:42.361729
695	9	-500	bet	Coin Flip play	2026-02-15 14:27:55.615347
696	9	975	win	Coin Flip win	2026-02-15 14:27:55.675706
697	9	-500	bet	Coin Flip play	2026-02-15 14:28:02.426874
698	9	-500	bet	Coin Flip play	2026-02-15 14:28:08.144203
699	9	975	win	Coin Flip win	2026-02-15 14:28:08.213457
700	9	-500	bet	Coin Flip play	2026-02-15 14:28:13.618771
701	9	-500	bet	Coin Flip play	2026-02-15 14:28:17.74485
702	9	975	win	Coin Flip win	2026-02-15 14:28:17.805442
703	9	-500	bet	Coin Flip play	2026-02-15 14:28:23.786951
704	9	975	win	Coin Flip win	2026-02-15 14:28:23.851053
705	9	-500	bet	Coin Flip play	2026-02-15 14:28:28.626165
706	9	975	win	Coin Flip win	2026-02-15 14:28:28.68568
707	9	-500	bet	Coin Flip play	2026-02-15 14:28:33.197069
708	9	-500	bet	Coin Flip play	2026-02-15 14:28:37.492239
709	9	-500	bet	Coin Flip play	2026-02-15 14:28:41.800283
710	9	-500	bet	Coin Flip play	2026-02-15 14:28:46.348421
711	9	-500	bet	Coin Flip play	2026-02-15 14:28:53.139196
712	9	-500	bet	Coin Flip play	2026-02-15 14:28:58.297659
713	9	-500	bet	Coin Flip play	2026-02-15 14:29:02.907379
714	9	975	win	Coin Flip win	2026-02-15 14:29:02.971129
715	9	-500	bet	Coin Flip play	2026-02-15 14:29:08.334578
716	9	975	win	Coin Flip win	2026-02-15 14:29:08.395371
717	9	-500	bet	Coin Flip play	2026-02-15 14:29:12.805561
718	9	-500	bet	Coin Flip play	2026-02-15 14:29:19.386549
719	9	975	win	Coin Flip win	2026-02-15 14:29:19.447504
720	9	-500	bet	Coin Flip play	2026-02-15 14:29:35.48565
721	9	-500	bet	Coin Flip play	2026-02-15 14:29:40.386453
722	9	-500	bet	Coin Flip play	2026-02-15 14:29:45.539996
723	9	975	win	Coin Flip win	2026-02-15 14:29:45.611461
724	9	-500	bet	Dice roll	2026-02-15 14:30:10.131199
725	9	-500	bet	Dice roll	2026-02-15 14:30:20.191565
726	9	1000	win	Dice win	2026-02-15 14:30:20.257141
727	9	-500	bet	Dice roll	2026-02-15 14:30:37.652549
728	9	1000	win	Dice win	2026-02-15 14:30:37.720842
729	9	-500	bet	Dice roll	2026-02-15 14:30:47.345862
730	9	-500	bet	Dice roll	2026-02-15 14:30:56.454071
731	9	1000	win	Dice win	2026-02-15 14:30:56.522206
732	9	-500	bet	Plinko play	2026-02-15 14:31:29.133346
733	9	1000	win	Plinko win	2026-02-15 14:31:29.212428
734	9	-500	bet	Plinko play	2026-02-15 14:31:35.724405
735	9	1000	win	Plinko win	2026-02-15 14:31:35.785415
736	9	-500	bet	Plinko play	2026-02-15 14:31:44.42433
737	9	600	win	Plinko win	2026-02-15 14:31:44.487761
738	9	-500	bet	Plinko play	2026-02-15 14:31:49.776717
739	9	600	win	Plinko win	2026-02-15 14:31:49.837534
740	9	-500	bet	Plinko play	2026-02-15 14:31:57.39969
741	9	2500	win	Plinko win	2026-02-15 14:31:57.463618
742	9	0	win	Keno: 1 hits on 2 numbers	2026-02-15 14:34:51.688458
743	9	-500	bet	Keno: 1 hits on 3 numbers	2026-02-15 14:34:57.936907
744	9	-500	bet	Keno: 4 hits on 10 numbers	2026-02-15 14:35:05.948354
745	9	-500	bet	Coin Flip play	2026-02-15 14:35:46.951624
746	9	-500	bet	Coin Flip play	2026-02-15 14:35:51.083717
747	9	-500	bet	Coin Flip play	2026-02-15 14:35:54.833975
748	9	-500	bet	Coin Flip play	2026-02-15 14:35:58.561748
749	9	975	win	Coin Flip win	2026-02-15 14:35:58.624134
750	9	-500	bet	Coin Flip play	2026-02-15 14:36:04.333546
751	9	-500	bet	Coin Flip play	2026-02-15 14:36:08.182968
752	9	-500	bet	Coin Flip play	2026-02-15 14:36:12.06206
753	9	-500	bet	Coin Flip play	2026-02-15 14:36:20.213174
754	9	-500	bet	Coin Flip play	2026-02-15 14:36:28.371098
755	9	-500	bet	Poker deal	2026-02-15 14:37:07.168288
756	9	-500	bet	Poker deal	2026-02-15 14:37:20.973782
757	9	-500	bet	Dice roll	2026-02-15 14:37:45.07025
758	9	-500	bet	Dice roll	2026-02-15 14:37:50.399753
759	9	1000	win	Dice win	2026-02-15 14:37:50.461034
760	9	-500	bet	Dice roll	2026-02-15 14:37:56.772651
761	9	1000	win	Dice win	2026-02-15 14:37:56.835866
762	9	-500	bet	Dice roll	2026-02-15 14:38:01.713566
763	9	1000	win	Dice win	2026-02-15 14:38:01.775097
764	9	-500	bet	Dice roll	2026-02-15 14:38:08.456953
765	9	-500	bet	Dice roll	2026-02-15 14:38:13.348017
766	9	-500	bet	Dice roll	2026-02-15 14:38:18.090466
767	9	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-15 14:38:55.658671
768	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-15 14:39:08.872293
769	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-15 14:39:08.935898
770	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-15 14:39:13.668278
771	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-15 14:39:15.715587
772	21	5000	voucher_redemption	Guest login with voucher 0B1C72F1	2026-02-16 15:52:36.977669
773	22	10000	voucher_redemption	Guest login with voucher B34DF382	2026-02-16 18:47:21.805625
774	22	-500	bet	Slots spin	2026-02-16 18:48:16.529283
775	22	5000	win	Slots win	2026-02-16 18:48:16.613389
776	22	-500	bet	Slots spin	2026-02-16 18:48:52.607218
777	22	-500	bet	Slots spin	2026-02-16 18:48:58.752281
778	22	-500	bet	Slots spin	2026-02-16 18:49:04.632919
779	22	-500	bet	Slots spin	2026-02-16 18:49:11.593806
780	22	-500	bet	Slots spin	2026-02-16 18:49:49.688803
781	22	5000	win	Slots win	2026-02-16 18:49:49.755508
782	22	-500	bet	Slots spin	2026-02-16 18:50:01.848338
783	22	-500	bet	Slots spin	2026-02-16 18:50:07.468781
784	22	-500	bet	Slots spin	2026-02-16 18:50:12.530769
785	22	-500	bet	Slots spin	2026-02-16 18:50:19.121649
786	22	-500	bet	Slots spin	2026-02-16 18:50:23.331607
787	22	-500	bet	Slots spin	2026-02-16 18:50:30.560619
788	22	5000	win	Slots win	2026-02-16 18:50:30.629558
789	22	-500	bet	Slots spin	2026-02-16 18:50:48.292915
790	22	5000	win	Slots win	2026-02-16 18:50:48.359458
791	22	-500	bet	Slots spin	2026-02-16 18:51:04.103816
792	22	5000	win	Slots win	2026-02-16 18:51:04.166604
793	22	-500	bet	Slots spin	2026-02-16 18:51:08.726037
794	22	5000	win	Slots win	2026-02-16 18:51:08.796714
795	22	-500	bet	Roulette spin	2026-02-16 18:51:57.31537
796	22	-500	bet	Roulette spin	2026-02-16 18:52:16.550637
797	22	17500	win	Roulette win	2026-02-16 18:52:16.614608
798	22	-500	bet	Roulette spin	2026-02-16 18:52:27.581094
799	22	-500	bet	Roulette spin	2026-02-16 18:52:36.422648
800	22	17500	win	Roulette win	2026-02-16 18:52:36.490697
801	22	-500	bet	Roulette spin	2026-02-16 18:52:49.611118
802	22	17500	win	Roulette win	2026-02-16 18:52:49.675241
803	22	-500	bet	Roulette spin	2026-02-16 18:53:10.265705
804	22	-500	bet	Roulette spin	2026-02-16 18:53:24.781233
805	22	1000	win	Roulette win	2026-02-16 18:53:24.845318
806	22	-500	bet	Roulette spin	2026-02-16 18:53:31.893015
807	22	17500	win	Roulette win	2026-02-16 18:53:31.957382
808	22	-500	bet	Roulette spin	2026-02-16 18:53:38.31336
809	22	-500	bet	Roulette spin	2026-02-16 18:53:42.922513
810	22	17500	win	Roulette win	2026-02-16 18:53:42.986686
811	22	-500	bet	Roulette spin	2026-02-16 18:53:51.162488
812	22	-500	bet	Roulette spin	2026-02-16 18:53:59.38518
813	22	-500	bet	Roulette spin	2026-02-16 18:54:05.693789
814	22	-50000	bet	Dice roll	2026-02-16 18:54:30.330733
815	22	-50000	bet	Dice roll	2026-02-16 18:54:38.695638
816	22	-500	bet	Dice roll	2026-02-16 18:54:55.016019
817	22	-500	bet	Dice roll	2026-02-16 18:55:00.080777
818	22	-1000	bet	Dice roll	2026-02-16 18:55:08.099977
819	22	-500	bet	Dice roll	2026-02-16 18:55:16.437445
820	22	-500	bet	Dice roll	2026-02-16 18:55:34.010571
821	22	1000	win	Dice win	2026-02-16 18:55:34.072997
822	22	-1000	bet	Dice roll	2026-02-16 18:55:43.373901
823	22	-500	bet	HiLo play	2026-02-16 18:56:29.010371
824	22	-500	bet	HiLo play	2026-02-16 18:56:39.559145
825	22	-500	bet	HiLo play	2026-02-16 18:56:44.038646
826	22	-500	bet	HiLo play	2026-02-16 18:56:53.420173
827	22	-500	bet	HiLo play	2026-02-16 18:56:58.533539
828	22	1000	win	HiLo win	2026-02-16 18:56:58.593713
829	22	-500	bet	HiLo play	2026-02-16 18:57:06.207323
830	22	-500	bet	HiLo play	2026-02-16 18:57:08.633271
831	22	1000	win	HiLo win	2026-02-16 18:57:08.694774
832	22	-500	bet	HiLo play	2026-02-16 18:57:13.002928
833	22	-500	bet	HiLo play	2026-02-16 18:57:18.298666
834	22	1000	win	HiLo win	2026-02-16 18:57:18.362975
835	22	-500	bet	HiLo play	2026-02-16 18:57:23.671334
836	22	-500	bet	HiLo play	2026-02-16 18:57:29.583456
837	22	-500	bet	HiLo play	2026-02-16 18:57:34.476313
838	22	-500	bet	HiLo play	2026-02-16 18:57:38.081008
839	22	1000	win	HiLo win	2026-02-16 18:57:38.142863
840	22	-500	bet	HiLo play	2026-02-16 18:57:46.766793
841	22	1000	win	HiLo win	2026-02-16 18:57:46.833839
842	22	-500	bet	HiLo play	2026-02-16 18:57:50.003816
843	22	-500	bet	HiLo play	2026-02-16 18:57:52.275042
844	22	-500	bet	HiLo play	2026-02-16 18:57:54.273131
845	22	-500	bet	Coin Flip play	2026-02-16 18:58:15.382429
846	22	975	win	Coin Flip win	2026-02-16 18:58:15.444876
847	22	-1000	bet	Coin Flip play	2026-02-16 18:58:26.970588
848	22	1950	win	Coin Flip win	2026-02-16 18:58:27.041529
849	22	-1000	bet	Coin Flip play	2026-02-16 18:58:33.38103
850	22	1950	win	Coin Flip win	2026-02-16 18:58:33.442245
851	22	-1000	bet	Coin Flip play	2026-02-16 18:58:38.464399
852	22	-1000	bet	Coin Flip play	2026-02-16 18:58:44.813614
853	22	-1000	bet	Coin Flip play	2026-02-16 18:58:49.795417
854	22	-1000	bet	Coin Flip play	2026-02-16 18:58:53.967401
855	22	-500	bet	Plinko play	2026-02-16 18:59:13.460987
856	22	250	win	Plinko win	2026-02-16 18:59:13.526872
857	22	-500	bet	Plinko play	2026-02-16 18:59:25.409897
858	22	250	win	Plinko win	2026-02-16 18:59:25.473546
859	22	-500	bet	Plinko play	2026-02-16 18:59:45.846557
860	22	1000	win	Plinko win	2026-02-16 18:59:45.92004
861	22	-500	bet	Plinko play	2026-02-16 19:00:02.231479
862	22	100	win	Plinko win	2026-02-16 19:00:02.304874
863	22	-500	bet	Plinko play	2026-02-16 19:00:10.893216
864	22	250	win	Plinko win	2026-02-16 19:00:10.956041
865	22	-500	bet	Plinko play	2026-02-16 19:00:18.552318
866	22	100	win	Plinko win	2026-02-16 19:00:18.621784
867	22	-500	bet	Plinko play	2026-02-16 19:00:24.332838
868	22	1000	win	Plinko win	2026-02-16 19:00:24.393443
869	22	-500	bet	Plinko play	2026-02-16 19:00:36.295868
870	22	250	win	Plinko win	2026-02-16 19:00:36.361688
871	22	-500	bet	Mines play	2026-02-16 19:01:08.060869
872	22	-500	bet	Mines play	2026-02-16 19:01:17.62636
873	22	800	win	Mines win	2026-02-16 19:01:17.691588
874	22	-500	bet	Mines play	2026-02-16 19:01:23.105922
875	22	1100	win	Mines win	2026-02-16 19:01:23.170856
876	22	-500	bet	Mines play	2026-02-16 19:01:25.651352
877	22	1400	win	Mines win	2026-02-16 19:01:25.719448
878	22	-500	bet	Mines play	2026-02-16 19:01:27.713101
879	22	-500	bet	Wheel spin	2026-02-16 19:02:13.47077
880	22	-500	bet	Wheel spin	2026-02-16 19:02:21.644921
881	22	1000	win	Wheel win x2	2026-02-16 19:02:21.706139
882	22	-500	bet	Wheel spin	2026-02-16 19:02:31.098889
883	22	500	win	Wheel win x1	2026-02-16 19:02:31.163992
884	22	-500	bet	Wheel spin	2026-02-16 19:02:40.555664
885	22	250	win	Wheel win x0.5	2026-02-16 19:02:40.617578
886	22	-500	bet	Wheel spin	2026-02-16 19:02:50.049063
887	22	1000	win	Wheel win x2	2026-02-16 19:02:50.114483
888	22	-500	bet	Wheel spin	2026-02-16 19:02:59.468033
889	22	-500	bet	Wheel spin	2026-02-16 19:03:08.018246
890	22	-500	bet	Wheel spin	2026-02-16 19:03:16.859148
891	22	750	win	Wheel win x1.5	2026-02-16 19:03:16.921497
892	22	-500	bet	Wheel spin	2026-02-16 19:03:26.231324
893	22	1000	win	Wheel win x2	2026-02-16 19:03:26.295895
894	22	-500	bet	Wheel spin	2026-02-16 19:03:37.001754
895	22	750	win	Wheel win x1.5	2026-02-16 19:03:37.063337
896	22	-500	bet	Wheel spin	2026-02-16 19:03:45.453556
897	22	250	win	Wheel win x0.5	2026-02-16 19:03:45.521322
898	22	-500	bet	Wheel spin	2026-02-16 19:03:54.919173
899	22	-500	bet	Wheel spin	2026-02-16 19:04:04.638438
900	22	-500	bet	Wheel spin	2026-02-16 19:04:13.87105
901	22	1500	win	Wheel win x3	2026-02-16 19:04:13.933597
902	22	-500	bet	Wheel spin	2026-02-16 19:04:44.39387
903	22	-500	bet	Wheel spin	2026-02-16 19:04:52.865422
904	22	-500	bet	Poker deal	2026-02-16 19:05:27.182837
905	22	-500	bet	Poker deal	2026-02-16 19:05:43.457988
906	22	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-16 19:06:17.322043
907	22	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-16 19:06:19.952582
908	22	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-16 19:06:22.696118
909	22	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-16 19:06:24.638807
910	23	10000	voucher_redemption	Guest login with voucher F8E55B7B	2026-02-19 17:28:22.057539
911	23	-500	bet	Slots spin	2026-02-19 17:29:16.093223
912	23	-500	bet	Slots spin	2026-02-19 17:29:46.674993
913	23	-500	bet	Roulette spin	2026-02-19 17:30:26.789077
914	23	-500	bet	Roulette spin	2026-02-19 17:30:53.09394
915	23	-500	bet	Dice roll	2026-02-19 17:31:28.343807
916	23	-500	bet	Dice roll	2026-02-19 17:31:43.036666
917	23	-500	bet	HiLo play	2026-02-19 17:32:22.577333
918	23	-500	bet	HiLo play	2026-02-19 17:32:34.197863
919	23	1000	win	HiLo win	2026-02-19 17:32:34.268803
920	23	-500	bet	Coin Flip play	2026-02-19 17:33:21.756471
921	23	-500	bet	Coin Flip play	2026-02-19 17:33:33.239757
922	23	975	win	Coin Flip win	2026-02-19 17:33:33.315518
923	23	-500	bet	Plinko play	2026-02-19 17:34:11.679786
924	23	1000	win	Plinko win	2026-02-19 17:34:11.747612
925	23	-500	bet	Plinko play	2026-02-19 17:34:27.380997
926	23	100	win	Plinko win	2026-02-19 17:34:27.446378
927	23	-500	bet	Plinko play	2026-02-19 17:34:42.099993
928	23	1000	win	Plinko win	2026-02-19 17:34:42.161194
929	23	-500	bet	Plinko play	2026-02-19 17:34:52.777866
930	23	250	win	Plinko win	2026-02-19 17:34:52.840954
931	23	-500	bet	Plinko play	2026-02-19 17:35:03.118301
932	23	100	win	Plinko win	2026-02-19 17:35:03.190237
933	23	-500	bet	Mines play	2026-02-19 17:35:34.596204
934	23	-500	bet	Mines play	2026-02-19 17:35:34.692926
935	23	800	win	Mines win	2026-02-19 17:35:34.756021
936	23	-500	bet	Mines play	2026-02-19 17:35:49.895452
937	23	-500	bet	Mines play	2026-02-19 17:36:04.559826
938	23	800	win	Mines win	2026-02-19 17:36:04.627026
939	23	-500	bet	Wheel spin	2026-02-19 17:36:58.988441
940	23	250	win	Wheel win x0.5	2026-02-19 17:36:59.059429
941	23	-500	bet	Wheel spin	2026-02-19 17:37:13.122905
942	23	-500	bet	Wheel spin	2026-02-19 17:37:23.702423
943	23	-500	bet	Wheel spin	2026-02-19 17:37:32.265182
944	23	500	win	Wheel win x1	2026-02-19 17:37:32.324622
945	23	-500	bet	Wheel spin	2026-02-19 17:37:43.973013
946	23	-500	bet	Poker deal	2026-02-19 17:38:17.268115
947	23	1000	win	Poker win	2026-02-19 17:38:29.433166
948	23	-500	bet	Poker deal	2026-02-19 17:38:45.79943
949	23	-500	bet	Keno: 0 hits on 2 numbers	2026-02-19 17:39:24.168454
950	23	-500	bet	Fish Hunt: Shot at whale	2026-02-19 17:39:56.948079
951	23	-500	bet	Fish Hunt: Shot at small_fish	2026-02-19 17:40:06.538703
952	23	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-19 17:40:06.604544
953	23	-500	bet	Fish Hunt: Shot at small_fish	2026-02-19 17:40:24.828309
954	23	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-19 17:40:24.889354
955	23	-500	bet	Fish Hunt: Shot at small_fish	2026-02-19 17:40:26.295436
956	23	-500	bet	Fish Hunt: Shot at small_fish	2026-02-19 17:40:45.248215
957	23	-1500	bet	Classic Slots spin	2026-02-19 17:41:47.903252
958	23	1500	win	Classic Slots win	2026-02-19 17:41:54.046489
959	23	-1000	bet	Classic Slots spin	2026-02-19 17:42:36.101721
960	23	-500	bet	Classic Slots spin	2026-02-19 17:43:25.966194
961	23	500	win	Classic Slots win	2026-02-19 17:43:31.620413
962	23	-500	bet	Classic Slots spin	2026-02-19 17:43:37.700206
963	23	-2000	withdrawal	Withdrawal request pending: 3 (Manager: john)	2026-02-19 17:45:13.438503
964	24	10000	voucher_redemption	Guest login with voucher D9C4E453	2026-02-19 19:18:19.494335
965	24	-500	bet	Wheel spin	2026-02-19 19:19:53.638216
966	24	500	win	Wheel win x1	2026-02-19 19:19:53.699199
967	24	-500	bet	Wheel spin	2026-02-19 19:20:14.467597
968	24	-500	bet	Wheel spin	2026-02-19 19:20:25.622615
969	24	-500	bet	Wheel spin	2026-02-19 19:20:45.057419
970	24	-500	bet	Wheel spin	2026-02-19 19:20:56.510694
971	24	250	win	Wheel win x0.5	2026-02-19 19:20:56.583882
972	24	-500	bet	Wheel spin	2026-02-19 19:21:24.73455
973	24	-500	bet	Wheel spin	2026-02-19 19:21:35.309206
974	24	-500	bet	Wheel spin	2026-02-19 19:22:00.347433
975	24	-500	bet	Wheel spin	2026-02-19 19:22:11.45622
976	24	1000	win	Wheel win x2	2026-02-19 19:22:11.517241
977	24	-500	bet	Wheel spin	2026-02-19 19:22:39.478367
978	24	-500	bet	Wheel spin	2026-02-19 19:22:49.282265
979	24	-500	bet	Slots spin	2026-02-19 21:09:39.997458
980	24	-500	bet	Slots spin	2026-02-19 21:09:44.934461
981	24	-500	bet	Slots spin	2026-02-19 21:09:50.529443
982	24	-500	bet	Slots spin	2026-02-19 21:09:55.827018
983	24	5000	win	Slots win	2026-02-19 21:09:55.88738
984	24	-500	bet	Slots spin	2026-02-19 21:10:48.085264
985	24	-500	bet	Slots spin	2026-02-19 21:10:52.444363
986	24	-500	bet	Slots spin	2026-02-19 21:10:56.418877
987	24	-500	bet	Slots spin	2026-02-19 21:11:00.196153
988	24	-500	bet	Slots spin	2026-02-19 21:11:03.992111
989	24	-500	bet	Slots spin	2026-02-19 21:11:08.16607
990	24	-500	bet	Slots spin	2026-02-19 21:11:11.812267
991	24	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-19 21:12:46.60164
992	24	-1000	bet	Fish Hunt: Shot at pufferfish	2026-02-19 21:12:49.976818
993	24	-1000	bet	Fish Hunt: Shot at small_fish	2026-02-19 21:12:55.722026
994	24	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-19 21:13:00.976872
995	24	3000	win	Fish Hunt: Caught medium_fish (x3)	2026-02-19 21:13:01.054778
996	24	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-19 21:13:28.084297
997	24	3000	win	Fish Hunt: Caught medium_fish (x3)	2026-02-19 21:13:28.144929
998	24	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-19 21:13:40.247889
999	24	3000	win	Fish Hunt: Caught medium_fish (x3)	2026-02-19 21:13:40.309504
1000	24	-1000	bet	Fish Hunt: Shot at mermaid	2026-02-19 21:13:50.914302
1001	24	-1000	bet	Fish Hunt: Shot at octopus	2026-02-19 21:14:02.233215
1002	24	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-19 21:14:15.982937
1003	24	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-19 21:14:41.21977
1004	24	3000	win	Fish Hunt: Caught medium_fish (x3)	2026-02-19 21:14:41.282891
1005	24	-1000	bet	Fish Hunt: Shot at pufferfish	2026-02-19 21:15:11.181305
1006	9	10000	voucher_redemption	Redeemed voucher 296C205E	2026-02-21 05:05:54.249059
1007	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-21 05:06:38.554961
1008	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-21 05:06:38.622479
1009	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-21 05:06:44.630365
1010	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-21 05:06:53.083926
1011	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-21 05:06:56.423028
1012	9	1500	win	Fish Hunt: Caught medium_fish (x3)	2026-02-21 05:06:56.486796
1013	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-21 05:07:00.642846
1014	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-21 05:07:03.518484
1015	9	-500	bet	Fish Hunt: Shot at turtle	2026-02-21 05:07:06.717082
1016	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-21 05:07:09.642888
1017	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-21 05:07:12.292226
1018	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-21 05:07:14.43041
1019	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-21 05:07:16.750468
1020	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-21 05:07:27.487487
1021	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-21 05:07:27.548345
1022	9	-500	bet	Fish Hunt: Shot at shark	2026-02-21 05:07:31.760318
1023	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-21 05:07:36.058569
1024	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-21 05:07:39.654815
1025	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-21 05:07:43.07814
1026	9	2500	win	Fish Hunt: Caught pufferfish (x5)	2026-02-21 05:07:43.13734
1027	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-21 05:07:50.626484
1028	9	1500	win	Fish Hunt: Caught medium_fish (x3)	2026-02-21 05:07:50.69645
1219	9	-500	bet	Wheel spin	2026-02-24 18:23:44.294515
1226	9	-500	bet	Wheel spin	2026-02-24 18:24:49.604541
1231	9	-500	bet	Wheel spin	2026-02-24 18:25:33.326091
1232	9	500	win	Wheel win x1	2026-02-24 18:25:33.391786
1235	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-24 18:26:09.758809
1239	9	-500	bet	Fish Hunt: Shot at shark	2026-02-24 18:26:32.812574
1241	9	-500	bet	Fish Hunt: Shot at shark	2026-02-24 18:26:35.900985
1243	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-24 18:26:43.894666
1246	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-24 18:26:51.265563
1248	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-24 18:26:54.857532
1250	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-24 18:26:58.645285
1255	9	-500	bet	Fish Hunt: Shot at shark	2026-02-24 18:27:29.606978
1258	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:27:39.268281
1260	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:27:41.981288
1262	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:27:44.4141
1275	26	-500	bet	Fish Hunt: Shot at whale	2026-02-25 15:19:47.213733
1276	26	-500	bet	Fish Hunt: Shot at whale	2026-02-25 15:19:48.464299
1281	9	-500	bet	Slots spin	2026-02-27 17:29:04.472989
1282	9	1750	win	Slots win	2026-02-27 17:29:04.541337
1285	9	-500	bet	Slots spin	2026-02-27 17:29:22.895786
1289	9	-500	bet	Slots spin	2026-02-27 17:29:47.075269
1290	9	1750	win	Slots win	2026-02-27 17:29:47.139059
1291	9	-1000	bet	Slots spin	2026-02-27 17:32:02.756502
1295	9	-1000	bet	Slots spin	2026-02-27 17:32:28.669306
1302	9	-1000	bet	Slots spin	2026-02-27 17:33:00.072156
1303	9	2500	win	Slots win	2026-02-27 17:33:00.14057
1307	9	-1000	bet	Slots spin	2026-02-27 17:33:23.803439
1310	9	-1000	bet	Slots spin	2026-02-27 17:33:38.800113
1311	9	2500	win	Slots win	2026-02-27 17:33:38.868707
1315	9	-1000	bet	Slots spin	2026-02-27 17:34:10.016885
1317	9	-2000	bet	Classic Slots spin	2026-02-27 17:35:46.900883
1318	9	500	win	Classic Slots win	2026-02-27 17:35:49.470339
1320	9	12500	win	Classic Slots win	2026-02-27 17:36:10.086885
1322	9	6000	win	Classic Slots win	2026-02-27 17:36:30.47506
1324	9	6000	win	Classic Slots win	2026-02-27 17:36:36.537626
1325	9	-10000	bet	Classic Slots spin	2026-02-27 17:36:47.002497
1326	9	9000	win	Classic Slots win	2026-02-27 17:36:51.277224
1328	9	7000	win	Classic Slots win	2026-02-27 17:37:36.81031
1330	9	-10000	bet	Classic Slots spin	2026-02-27 17:37:53.394552
1332	9	-2000	bet	Classic Slots spin	2026-02-27 17:38:22.442809
1334	9	-2000	bet	Classic Slots spin	2026-02-27 17:38:34.314425
1335	9	-2000	bet	Classic Slots spin	2026-02-27 17:38:45.153569
1337	9	-2000	bet	Classic Slots spin	2026-02-27 17:39:08.613706
1339	9	-500	bet	HiLo play	2026-02-27 17:39:52.376695
1340	9	2500	win	HiLo win	2026-02-27 17:39:52.438998
1342	9	-500	bet	HiLo play	2026-02-27 17:40:05.467702
1344	9	-500	bet	HiLo play	2026-02-27 17:40:15.720571
1346	9	-500	bet	HiLo play	2026-02-27 17:40:57.357116
1349	9	-500	bet	HiLo play	2026-02-27 17:41:15.437265
1352	9	-500	bet	HiLo play	2026-02-27 17:41:25.56265
1353	9	2500	win	HiLo win	2026-02-27 17:41:25.627216
1355	9	-500	bet	HiLo play	2026-02-27 17:42:24.332647
1357	9	-500	bet	HiLo play	2026-02-27 17:42:45.673513
1359	9	-500	bet	HiLo play	2026-02-27 17:42:57.598364
1360	9	2500	win	HiLo win	2026-02-27 17:42:57.662333
1363	9	-500	bet	HiLo play	2026-02-27 17:43:08.296208
1365	9	-500	bet	HiLo play	2026-02-27 17:43:20.514637
1367	9	-500	bet	HiLo play	2026-02-27 17:43:33.776006
1369	9	-500	bet	HiLo play	2026-02-27 17:43:41.19362
1371	9	-500	bet	HiLo play	2026-02-27 17:43:50.884023
1374	9	-500	bet	HiLo play	2026-02-27 17:44:05.881567
1376	9	-500	bet	HiLo play	2026-02-27 17:44:15.103269
1377	9	2500	win	HiLo win	2026-02-27 17:44:15.166599
1379	9	-500	bet	HiLo play	2026-02-27 17:44:28.287353
1381	9	-500	bet	HiLo play	2026-02-27 17:44:37.860499
1384	9	-500	bet	HiLo play	2026-02-27 17:44:49.670376
1386	9	-500	bet	HiLo play	2026-02-27 17:44:55.422272
1389	9	-500	bet	HiLo play	2026-02-27 17:45:03.289789
1392	9	-500	bet	HiLo play	2026-02-27 17:45:10.241608
1393	9	2500	win	HiLo win	2026-02-27 17:45:10.31003
1395	9	-500	bet	HiLo play	2026-02-27 17:45:26.134239
1397	9	-500	bet	HiLo play	2026-02-27 17:45:34.822124
1398	9	-500	bet	Roulette spin	2026-02-27 17:46:04.178644
1400	9	-500	bet	Roulette spin	2026-02-27 17:46:28.907077
1402	9	-500	bet	Roulette spin	2026-02-27 17:46:58.960147
1404	9	-1000	bet	Roulette spin	2026-02-27 17:47:28.818064
1406	9	-1000	bet	Roulette spin	2026-02-27 17:47:57.474056
1409	9	-5000	bet	Roulette spin	2026-02-27 17:48:36.756556
1411	9	-5000	bet	Roulette spin	2026-02-27 17:49:01.518157
1413	9	-5000	bet	Roulette spin	2026-02-27 17:49:33.672076
1415	9	-5000	bet	Roulette spin	2026-02-27 17:50:20.051376
1418	9	-500	bet	Dice roll	2026-02-27 17:51:22.949223
1419	9	1500	win	Dice win	2026-02-27 17:51:23.014488
1422	9	-500	bet	Dice roll	2026-02-27 17:51:32.791503
1424	9	-500	bet	Dice roll	2026-02-27 17:51:47.737367
1426	9	-500	bet	Dice roll	2026-02-27 17:52:04.847642
1428	9	-500	bet	Coin Flip play	2026-02-27 17:53:08.854501
1429	9	-500	bet	Coin Flip play	2026-02-27 17:53:14.331608
1430	9	1250	win	Coin Flip win	2026-02-27 17:53:14.396072
1432	9	-500	bet	Coin Flip play	2026-02-27 17:53:38.204378
1436	9	-500	bet	Coin Flip play	2026-02-27 17:54:28.364103
1438	9	-500	bet	Coin Flip play	2026-02-27 17:54:41.050529
1439	9	1250	win	Coin Flip win	2026-02-27 17:54:41.134054
1442	9	-500	bet	Plinko play	2026-02-27 17:55:20.207804
1443	9	1000	win	Plinko win	2026-02-27 17:55:20.276743
1446	9	-500	bet	Plinko play	2026-02-27 17:55:36.942496
1447	9	250	win	Plinko win	2026-02-27 17:55:37.01099
1448	9	-500	bet	Plinko play	2026-02-27 17:56:00.377436
1449	9	1000	win	Plinko win	2026-02-27 17:56:00.444958
1452	9	-500	bet	Plinko play	2026-02-27 17:56:46.118194
1453	9	100	win	Plinko win	2026-02-27 17:56:46.195285
1454	9	-500	bet	Wheel spin	2026-02-27 17:58:08.444778
1455	9	-500	bet	Wheel spin	2026-02-27 17:58:20.186413
1456	9	500	win	Wheel win x1	2026-02-27 17:58:20.248944
1457	9	-500	bet	Wheel spin	2026-02-27 17:58:28.28886
1458	9	-500	bet	Wheel spin	2026-02-27 17:58:36.625237
1459	9	5000	voucher_redemption	Redeemed voucher D01BCF21	2026-03-02 13:37:59.464725
1460	9	-1000	bet	Wheel spin	2026-03-02 13:38:24.525627
1461	9	-500	bet	Wheel spin	2026-03-02 13:38:36.814285
1462	9	-500	bet	Wheel spin	2026-03-02 13:38:49.573951
1463	9	-500	bet	Wheel spin	2026-03-02 13:38:57.148165
1464	9	1000	win	Wheel win x2	2026-03-02 13:38:57.214457
1029	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-21 05:07:55.520416
1030	9	-1000	bet	Fish Hunt: Shot at scorpion_king	2026-02-21 05:23:57.985717
1031	9	-1000	bet	Fish Hunt: Shot at scorpion_king	2026-02-21 05:24:00.671931
1032	9	-1000	bet	Fish Hunt: Shot at scorpion_king	2026-02-21 05:24:03.873253
1033	9	-1000	bet	Fish Hunt: Shot at scorpion_king	2026-02-21 05:24:05.687399
1034	9	-1000	bet	Fish Hunt: Shot at scorpion_king	2026-02-21 05:24:07.873425
1035	9	-1000	bet	Fish Hunt: Shot at scorpion_king	2026-02-21 05:24:12.460799
1036	9	-1000	bet	Fish Hunt: Shot at scorpion_king	2026-02-21 05:24:15.224519
1037	9	-1000	bet	Fish Hunt: Shot at scorpion_king	2026-02-21 05:24:17.090627
1038	9	-500	bet	Wheel spin	2026-02-21 15:47:21.394546
1039	9	10000	voucher_redemption	Redeemed voucher 127C18D1	2026-02-22 08:58:26.395782
1040	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-22 08:59:19.077159
1041	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-22 08:59:20.297139
1042	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-22 08:59:21.544386
1043	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-22 08:59:23.351176
1044	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-22 08:59:24.529103
1045	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-22 08:59:25.655907
1046	9	1500	win	Fish Hunt: Caught medium_fish (x3)	2026-02-22 08:59:25.718433
1047	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-22 08:59:34.071465
1048	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-22 08:59:35.230124
1049	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-22 08:59:36.499068
1050	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-22 08:59:37.621167
1051	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-22 08:59:38.841432
1052	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-22 08:59:40.279071
1053	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-22 08:59:42.282207
1054	9	4000	win	Fish Hunt: Caught octopus (x8)	2026-02-22 08:59:42.358355
1055	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-22 08:59:59.189513
1056	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-22 09:00:00.474473
1057	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-22 09:00:01.929542
1058	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-22 09:00:03.224972
1059	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-22 09:00:04.568336
1060	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-22 09:00:09.067094
1061	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-22 09:00:09.126976
1062	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-22 09:00:43.702474
1063	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-22 09:00:45.309914
1064	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-22 09:00:47.585857
1065	9	-500	bet	Fish Hunt: Shot at jellyfish	2026-02-22 09:00:49.439528
1066	9	-500	bet	Dice roll	2026-02-22 09:04:24.595059
1067	9	-500	bet	Dice roll	2026-02-22 09:04:31.051775
1068	9	-500	bet	Dice roll	2026-02-22 09:04:37.787867
1069	25	10000	voucher_redemption	Guest login with voucher 517D14D9	2026-02-22 11:34:29.565353
1070	25	-1000	bet	Coin Flip play	2026-02-22 11:34:59.787487
1071	25	-1000	bet	Coin Flip play	2026-02-22 11:35:09.81612
1072	25	1950	win	Coin Flip win	2026-02-22 11:35:09.883189
1073	25	-1000	bet	Classic Slots spin	2026-02-22 11:36:22.42195
1074	25	1000	win	Classic Slots win	2026-02-22 11:36:28.067488
1075	25	-1000	bet	Classic Slots spin	2026-02-22 11:36:39.868579
1076	9	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-22 11:38:20.557377
1077	9	3000	win	Fish Hunt: Caught medium_fish (x3)	2026-02-22 11:38:20.621745
1078	9	-1000	bet	Fish Hunt: Shot at small_fish	2026-02-22 11:38:28.426844
1079	9	-1000	bet	Fish Hunt: Shot at small_fish	2026-02-22 11:38:29.652955
1080	9	-1000	bet	Fish Hunt: Shot at pufferfish	2026-02-22 11:38:31.680165
1081	9	-1000	bet	Fish Hunt: Shot at medium_fish	2026-02-22 21:07:45.32235
1082	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-22 21:08:01.436099
1083	9	-500	bet	Fish Hunt: Shot at shark	2026-02-22 21:08:04.237252
1084	9	5000	win	Fish Hunt: Caught shark (x10)	2026-02-22 21:08:04.303849
1085	9	-500	bet	Fish Hunt: Shot at whale	2026-02-22 21:08:30.437137
1086	9	-500	bet	Fish Hunt: Shot at whale	2026-02-22 21:08:31.879445
1087	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-22 21:08:43.809832
1088	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-22 21:08:47.140643
1089	9	-500	bet	Fish Hunt: Shot at octopus	2026-02-22 21:08:49.863413
1090	9	4000	win	Fish Hunt: Caught octopus (x8)	2026-02-22 21:08:49.92841
1091	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-22 21:08:54.771751
1092	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-22 21:08:54.833083
1093	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-22 21:09:02.154979
1094	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-22 21:09:04.622858
1095	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-22 21:09:06.419801
1096	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-22 21:09:08.898145
1097	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-22 21:09:08.964761
1098	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-22 21:09:12.361039
1099	9	-500	bet	Fish Hunt: Shot at medium_fish	2026-02-22 21:09:14.500211
1100	9	-500	bet	Fish Hunt: Shot at whale	2026-02-22 21:09:23.765334
1101	9	-2000	bet	Classic Slots spin	2026-02-24 03:35:10.449325
1102	9	-2000	bet	Classic Slots spin	2026-02-24 03:35:19.376578
1103	9	-300	bet	Classic Slots spin	2026-02-24 03:35:37.514784
1104	9	-300	bet	Classic Slots spin	2026-02-24 03:35:45.041058
1105	9	2500	win	Classic Slots win	2026-02-24 03:35:50.738186
1106	9	-300	bet	Classic Slots spin	2026-02-24 03:36:07.731953
1107	9	-300	bet	Classic Slots spin	2026-02-24 03:36:14.840099
1108	9	-300	bet	Classic Slots spin	2026-02-24 03:36:23.29172
1109	9	300	win	Classic Slots win	2026-02-24 03:36:27.795095
1110	9	-300	bet	Classic Slots spin	2026-02-24 03:36:31.794701
1111	9	-300	bet	Classic Slots spin	2026-02-24 03:36:41.470134
1112	9	-300	bet	Classic Slots spin	2026-02-24 03:36:49.074341
1113	9	-300	bet	Classic Slots spin	2026-02-24 03:36:55.625636
1114	9	-300	bet	Classic Slots spin	2026-02-24 03:37:04.616599
1115	9	-300	bet	Classic Slots spin	2026-02-24 03:37:12.970357
1116	9	-300	bet	Classic Slots spin	2026-02-24 03:37:21.081745
1117	9	-200	bet	Classic Slots spin	2026-02-24 03:37:40.713902
1118	9	10000	voucher_redemption	Redeemed voucher 9F4C6B57	2026-02-24 17:57:05.691496
1119	9	-300	bet	Classic Slots spin	2026-02-24 17:58:11.295538
1120	9	-600	bet	Classic Slots spin	2026-02-24 17:58:28.857299
1121	9	-600	bet	Classic Slots spin	2026-02-24 17:58:36.073643
1122	9	7000	win	Classic Slots win	2026-02-24 17:58:40.418379
1123	9	-600	bet	Classic Slots spin	2026-02-24 17:59:30.369048
1124	9	-600	bet	Classic Slots spin	2026-02-24 17:59:35.54853
1125	9	200	win	Classic Slots win	2026-02-24 17:59:42.408668
1126	9	-600	bet	Classic Slots spin	2026-02-24 18:00:04.70044
1127	9	-600	bet	Classic Slots spin	2026-02-24 18:00:43.109514
1128	9	1000	win	Classic Slots win	2026-02-24 18:00:49.213439
1129	9	-500	bet	Slots spin	2026-02-24 18:02:21.5271
1130	9	-500	bet	Slots spin	2026-02-24 18:02:27.171925
1131	9	-500	bet	Slots spin	2026-02-24 18:02:31.071613
1132	9	-500	bet	Slots spin	2026-02-24 18:02:35.825058
1133	9	-500	bet	Slots spin	2026-02-24 18:02:40.95233
1134	9	-500	bet	Slots spin	2026-02-24 18:02:48.739122
1135	9	-500	bet	Slots spin	2026-02-24 18:02:54.521038
1136	9	-500	bet	Slots spin	2026-02-24 18:02:59.005505
1137	9	-500	bet	Slots spin	2026-02-24 18:03:06.956209
1138	9	-500	bet	Slots spin	2026-02-24 18:03:11.778286
1139	9	-500	bet	Slots spin	2026-02-24 18:03:19.457185
1140	9	-500	bet	Slots spin	2026-02-24 18:03:24.820959
1141	9	-500	bet	Slots spin	2026-02-24 18:04:18.953435
1142	9	1750	win	Slots win	2026-02-24 18:04:19.023069
1143	9	-500	bet	Slots spin	2026-02-24 18:04:33.468709
1144	9	-500	bet	Slots spin	2026-02-24 18:04:40.908867
1145	9	1750	win	Slots win	2026-02-24 18:04:40.970628
1146	9	-500	bet	Slots spin	2026-02-24 18:04:53.906431
1147	9	-500	bet	Slots spin	2026-02-24 18:05:01.06521
1148	9	-500	bet	Slots spin	2026-02-24 18:05:08.70523
1149	9	1750	win	Slots win	2026-02-24 18:05:08.78415
1150	9	-500	bet	Slots spin	2026-02-24 18:05:14.822898
1151	9	1750	win	Slots win	2026-02-24 18:05:14.897154
1152	9	-500	bet	Slots spin	2026-02-24 18:05:22.837869
1153	9	-500	bet	Slots spin	2026-02-24 18:05:30.37092
1154	9	-500	bet	Slots spin	2026-02-24 18:05:35.168302
1155	9	-500	bet	Slots spin	2026-02-24 18:05:42.431678
1156	9	1750	win	Slots win	2026-02-24 18:05:42.505725
1157	9	-500	bet	Slots spin	2026-02-24 18:05:51.049676
1158	9	1750	win	Slots win	2026-02-24 18:05:51.12353
1159	9	-500	bet	Slots spin	2026-02-24 18:05:56.473189
1160	9	1750	win	Slots win	2026-02-24 18:05:56.543647
1161	9	-500	bet	Slots spin	2026-02-24 18:06:06.879413
1162	9	-500	bet	Slots spin	2026-02-24 18:06:12.90184
1163	9	1750	win	Slots win	2026-02-24 18:06:12.964778
1164	9	-500	bet	Slots spin	2026-02-24 18:06:22.449403
1165	9	-500	bet	Slots spin	2026-02-24 18:06:29.769537
1166	9	1750	win	Slots win	2026-02-24 18:06:29.833875
1167	9	-500	bet	Slots spin	2026-02-24 18:06:43.478188
1168	9	1750	win	Slots win	2026-02-24 18:06:43.543352
1169	9	-500	bet	Roulette spin	2026-02-24 18:08:05.877016
1170	9	-500	bet	Roulette spin	2026-02-24 18:08:18.772548
1171	9	17500	win	Roulette win	2026-02-24 18:08:18.839275
1172	9	-500	bet	Roulette spin	2026-02-24 18:08:32.775963
1173	9	-500	bet	Roulette spin	2026-02-24 18:10:40.17274
1174	9	-500	bet	Roulette spin	2026-02-24 18:10:52.798286
1175	9	-500	bet	Roulette spin	2026-02-24 18:11:00.227139
1176	9	-500	bet	Roulette spin	2026-02-24 18:11:07.517397
1177	9	-500	bet	Roulette spin	2026-02-24 18:11:14.48468
1178	9	-500	bet	Roulette spin	2026-02-24 18:11:22.350014
1179	9	-500	bet	Roulette spin	2026-02-24 18:11:34.84885
1180	9	-500	bet	Roulette spin	2026-02-24 18:11:44.163329
1181	9	1000	win	Roulette win	2026-02-24 18:11:44.230383
1182	9	-500	bet	Roulette spin	2026-02-24 18:12:11.537868
1183	9	-500	bet	Roulette spin	2026-02-24 18:12:23.999907
1184	9	1000	win	Roulette win	2026-02-24 18:12:24.06769
1185	9	-500	bet	Roulette spin	2026-02-24 18:13:31.948967
1186	9	-500	bet	Dice roll	2026-02-24 18:15:03.307182
1187	9	-500	bet	Dice roll	2026-02-24 18:15:12.928996
1188	9	-500	bet	Dice roll	2026-02-24 18:15:20.554861
1189	9	-500	bet	Dice roll	2026-02-24 18:15:29.090905
1190	9	-500	bet	Dice roll	2026-02-24 18:15:36.657963
1191	9	1500	win	Dice win	2026-02-24 18:15:36.731388
1192	9	-500	bet	Dice roll	2026-02-24 18:15:44.971445
1193	9	1500	win	Dice win	2026-02-24 18:15:45.036989
1194	9	-500	bet	Dice roll	2026-02-24 18:15:50.777669
1195	9	-500	bet	Dice roll	2026-02-24 18:15:58.587844
1196	9	-500	bet	Dice roll	2026-02-24 18:16:07.803236
1197	9	1500	win	Dice win	2026-02-24 18:16:07.891067
1198	9	-500	bet	HiLo play	2026-02-24 18:17:40.535827
1199	9	-500	bet	HiLo play	2026-02-24 18:17:56.276889
1200	9	-500	bet	HiLo play	2026-02-24 18:18:06.476874
1201	9	2500	win	HiLo win	2026-02-24 18:18:06.54835
1202	9	-500	bet	Coin Flip play	2026-02-24 18:19:31.165923
1203	9	-500	bet	Coin Flip play	2026-02-24 18:20:13.522107
1204	9	-500	bet	Coin Flip play	2026-02-24 18:20:27.326233
1205	9	1250	win	Coin Flip win	2026-02-24 18:20:27.388276
1206	9	-500	bet	Coin Flip play	2026-02-24 18:21:23.996747
1207	9	-500	bet	Coin Flip play	2026-02-24 18:21:31.966614
1208	9	-500	bet	Plinko play	2026-02-24 18:22:09.149512
1209	9	250	win	Plinko win	2026-02-24 18:22:09.215019
1210	9	-500	bet	Plinko play	2026-02-24 18:22:19.644727
1211	9	1000	win	Plinko win	2026-02-24 18:22:19.71065
1212	9	-500	bet	Plinko play	2026-02-24 18:22:31.015703
1213	9	1000	win	Plinko win	2026-02-24 18:22:31.079736
1214	9	-500	bet	Plinko play	2026-02-24 18:22:36.550763
1215	9	100	win	Plinko win	2026-02-24 18:22:36.625373
1216	9	-500	bet	Plinko play	2026-02-24 18:22:44.973973
1217	9	100	win	Plinko win	2026-02-24 18:22:45.040797
1222	9	-500	bet	Wheel spin	2026-02-24 18:24:27.401531
1223	9	500	win	Wheel win x1	2026-02-24 18:24:27.463206
1227	9	-500	bet	Wheel spin	2026-02-24 18:24:59.917249
1228	9	750	win	Wheel win x1.5	2026-02-24 18:24:59.986753
1233	9	-500	bet	Wheel spin	2026-02-24 18:25:46.465443
1236	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-24 18:26:11.342151
1237	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-24 18:26:11.409813
1252	9	-500	bet	Fish Hunt: Shot at small_fish	2026-02-24 18:27:17.158735
1253	9	1000	win	Fish Hunt: Caught small_fish (x2)	2026-02-24 18:27:17.229017
1259	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:27:40.739362
1261	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:27:43.080793
1263	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:27:45.728486
1265	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:27:57.893371
1267	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:28:00.252144
1269	9	-500	bet	Fish Hunt: Shot at scorpion_king	2026-02-24 18:28:02.650125
1271	9	-500	bet	Fish Hunt: Shot at pufferfish	2026-02-24 18:28:11.011203
1272	26	5000	voucher_redemption	Guest login with voucher A115072F	2026-02-25 15:17:51.636126
1277	9	-500	bet	Slots spin	2026-02-27 17:28:15.533725
1278	9	1750	win	Slots win	2026-02-27 17:28:15.613613
1283	9	-500	bet	Slots spin	2026-02-27 17:29:12.119884
1286	9	-500	bet	Slots spin	2026-02-27 17:29:33.186794
1292	9	-1000	bet	Slots spin	2026-02-27 17:32:08.443
1296	9	-1000	bet	Slots spin	2026-02-27 17:32:33.695461
1297	9	2500	win	Slots win	2026-02-27 17:32:33.760686
1304	9	-1000	bet	Slots spin	2026-02-27 17:33:11.413862
1465	9	-600	bet	Classic Slots spin	2026-03-02 13:40:48.954027
1466	9	1000	win	Classic Slots win	2026-03-02 13:40:54.495628
1467	9	-600	bet	Classic Slots spin	2026-03-02 13:41:17.3337
1468	9	200	win	Classic Slots win	2026-03-02 13:41:22.715026
1469	9	-600	bet	Classic Slots spin	2026-03-02 13:41:32.5965
1470	9	2000	win	Classic Slots win	2026-03-02 13:41:38.273493
1471	9	-600	bet	Classic Slots spin	2026-03-02 13:41:58.990437
1472	9	-600	bet	Classic Slots spin	2026-03-02 13:42:23.989586
1473	9	-600	bet	Classic Slots spin	2026-03-02 13:42:39.51428
1474	9	-500	bet	Fish Hunt: Shot at turtle	2026-03-02 13:43:43.314133
1475	9	-200	bet	Fish Hunt: Shot at mermaid	2026-03-02 13:43:50.399217
1476	9	-200	bet	Fish Hunt: Shot at mermaid	2026-03-02 13:43:52.971378
1477	9	-200	bet	Fish Hunt: Shot at mermaid	2026-03-02 13:43:54.321094
1478	9	-200	bet	Fish Hunt: Shot at pufferfish	2026-03-02 13:44:04.021592
1479	9	-500	bet	Coin Flip play	2026-03-02 13:44:27.200491
1480	9	-500	bet	Coin Flip play	2026-03-02 13:44:36.585075
1481	9	-500	bet	Coin Flip play	2026-03-02 13:44:43.908784
1482	28	10000	voucher_redemption	Guest login with voucher 33BA88DC	2026-03-09 14:10:26.53195
1483	28	-300	bet	Classic Slots spin	2026-03-09 14:11:12.197216
1484	28	-300	bet	Classic Slots spin	2026-03-09 14:11:20.328126
1485	28	200	win	Classic Slots win	2026-03-09 14:11:25.945042
1486	28	-300	bet	Classic Slots spin	2026-03-09 14:11:57.662833
1487	28	-300	bet	Classic Slots spin	2026-03-09 14:12:03.754008
1488	28	1100	win	Classic Slots win	2026-03-09 14:12:09.350895
1489	28	-300	bet	Classic Slots spin	2026-03-09 14:12:32.998301
1490	28	-100	bet	Fish Hunt: Shot at medium_fish	2026-03-09 14:13:27.799273
1491	28	-500	bet	Wheel spin	2026-03-09 14:14:22.360894
1492	28	-500	bet	Wheel spin	2026-03-09 14:14:34.387022
1493	28	-500	bet	Wheel spin	2026-03-09 14:14:42.727829
1494	28	-500	bet	Wheel spin	2026-03-09 14:14:50.651663
1495	28	250	win	Wheel win x0.5	2026-03-09 14:14:50.717958
1496	28	-500	bet	Wheel spin	2026-03-09 14:15:04.065695
1497	28	-500	bet	Plinko play	2026-03-09 14:15:38.953718
1498	28	250	win	Plinko win	2026-03-09 14:15:39.017928
1499	28	-500	bet	Plinko play	2026-03-09 14:15:47.444181
1500	28	600	win	Plinko win	2026-03-09 14:15:47.503646
1501	28	-500	bet	Plinko play	2026-03-09 14:15:58.815049
1502	28	250	win	Plinko win	2026-03-09 14:15:58.882847
1503	28	-500	bet	Plinko play	2026-03-09 14:16:03.303509
1504	28	250	win	Plinko win	2026-03-09 14:16:03.36258
1505	28	-500	bet	Plinko play	2026-03-09 14:16:07.501738
1506	28	250	win	Plinko win	2026-03-09 14:16:07.568376
1507	28	-500	bet	Plinko play	2026-03-09 14:16:12.608199
1508	28	100	win	Plinko win	2026-03-09 14:16:12.669532
1509	28	-500	bet	Coin Flip play	2026-03-09 14:16:36.975742
1510	28	-500	bet	Coin Flip play	2026-03-09 14:16:53.852995
1511	28	-500	bet	Coin Flip play	2026-03-09 14:16:58.795367
1512	28	-500	bet	Coin Flip play	2026-03-09 14:17:04.485465
1513	28	1250	win	Coin Flip win	2026-03-09 14:17:04.546469
1514	28	-500	bet	HiLo play	2026-03-09 14:17:40.539618
1515	28	-500	bet	HiLo play	2026-03-09 14:17:49.691784
1516	28	-500	bet	HiLo play	2026-03-09 14:17:58.081392
1517	28	-500	bet	HiLo play	2026-03-09 14:18:05.105135
1518	28	-500	bet	Dice roll	2026-03-09 14:18:29.651209
1519	28	1500	win	Dice win	2026-03-09 14:18:29.712588
1520	28	-500	bet	Dice roll	2026-03-09 14:18:43.066599
1521	28	1500	win	Dice win	2026-03-09 14:18:43.130476
1522	28	-500	bet	Dice roll	2026-03-09 14:18:49.485187
1523	28	-500	bet	Roulette spin	2026-03-09 14:19:17.922688
1524	28	-500	bet	Slots spin	2026-03-09 14:19:50.169864
1525	28	1250	win	Slots win	2026-03-09 14:19:50.234943
1526	28	-500	bet	Slots spin	2026-03-09 14:20:08.675403
1527	28	-500	bet	Slots spin	2026-03-09 14:20:13.110176
1528	28	-500	bet	Slots spin	2026-03-09 14:20:17.771537
1529	28	-500	bet	Slots spin	2026-03-09 14:20:21.633355
1530	28	1250	win	Slots win	2026-03-09 14:20:21.692564
1531	28	-500	bet	Slots spin	2026-03-09 14:20:34.249991
1532	28	-500	bet	Slots spin	2026-03-09 14:20:39.835333
1533	28	1250	win	Slots win	2026-03-09 14:20:39.899399
1534	28	-500	bet	Slots spin	2026-03-09 14:20:54.011738
1535	28	-500	bet	Slots spin	2026-03-09 14:21:06.219586
1536	28	1250	win	Slots win	2026-03-09 14:21:06.282382
1537	28	-500	bet	Slots spin	2026-03-09 14:21:58.313057
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, role, balance, created_at, is_approved, is_suspended, created_by, profit_share_percentage, phone_number, withdraw_code, last_active) FROM stdin;
8	Edrineharder	c265d708c6e71fe66efc7051ad4f86a9006e8d73b068c0e0a0c4ea7c9bbe8da1ad95d4a802a0606b80b076e5acb0006995d31d3897f3f64eda0798b4aba4a343.c5b039c75b8ddad993602beada20e55b	admin	0	2026-02-08 09:27:33.785443	t	f	\N	0	\N	\N	\N
1	admin	97e61b6f1a102363bb7701cd8189b2b96ee02c7b0cc4595d30316f1091ce45fdc04a7f13557a21d7cff3336254c32af3ecf346cdf1755d5d460544ad4d83917f.4403b5124069dd37651b081e32cef369	admin	0	2026-01-16 11:52:24.682615	t	f	\N	0	\N	\N	\N
7	Guest_F3A062	94eb256be94cc27847c89dca58e7ead2	user	0	2026-01-22 10:52:24.610122	t	f	\N	0	\N	\N	\N
5	peter	a54ffe34a0231e1bfa6dfe0432cd7f18492485ac41175b6979716093c36f3d825b2da1ff4b992e12b512b315c9bb75e52d834f691a8e1be2d5a5da92d48b0e6e.288482f9facb8882830e8fcb35a967f6	user	20	2026-01-19 09:11:23.052072	t	f	\N	0	\N	\N	\N
4	ed	e24e86bfa58a0ff793828d661c00b9e78f22f7c2d29d66834b0bcab33362db9bcdbb86372c5a4cb7426024e324f75b297f90d8cb9f71f9eadc0ddf13e0027b8a.db6c7e7a3c8ab793981d3021a6fd8318	user	0	2026-01-16 12:10:52.784133	t	f	\N	0	\N	\N	\N
17	James 	d8503dde5641a241fb293a68131b8648ed12c5b16edf2cc274d182434d04d00f617a486124843dae9aabc3f1c15f0b4fe4748960c66a4cd67e693d2c9d549544.ce8ca8fd6531c6cdf74cc72494314e36	manager	0	2026-02-12 19:38:42.488236	t	f	2	0	+256782694709	112233	2026-03-09 19:56:13.825
14	Guest_DB135A	de5a0f4b40832e233315e7fd59199f70	user	0	2026-02-09 21:21:55.554029	t	f	11	0	\N	\N	2026-02-09 21:23:06.326
16	Guest_5C0897	dfa5b30a4ba7f6f0d2ac1fcd118ca4e2	user	250	2026-02-12 14:04:16.617743	t	f	9	0	\N	\N	2026-02-12 16:30:34.128
6	Guest_B7EAF5	a1e9df99a09dcfabd0dfb85b60f9859a	user	0	2026-01-22 06:11:07.974588	t	f	\N	0	\N	\N	\N
3	player1	442aea223027a94eb62d23f28ab2d386b77c7f94aece019b8c2114543952759328b09c5fe8bee7b7392e34637e3dddca81bab68cc189bf0429694ad1bbcee0fd.aff1b021d602275cc22f5b3c63531cc8	user	75	2026-01-16 11:52:24.93301	t	f	\N	0	\N	\N	\N
18	Joel	32dcaefc411dca80431d2723036064e949095f8d250ffd38c7fd95cdd403c794022ebc31ffb74194df7549879f3f8fb827f0fe8008f83ab614cf656be85ae46e.1e4ec47328fb13377af4f45aa29d72f6	user	250	2026-02-12 20:00:51.476488	t	f	17	0	\N	\N	2026-02-12 20:05:54.943
26	Guest_D81580	21ed09ac76bda502d74455ca3d6ece06	user	7500	2026-02-25 15:17:51.491349	t	f	9	0	\N	\N	2026-02-25 16:27:55.692
19	Jacob	61cb4e4cb565d824ffed570e4c1bf3d006124b4664221ff545071b2af72c688f9474ecc7857e40a38dec7b133f5fc324c5c4c7aa0f032f7283a2c43b874935af.5ad59bb40c128b4b6085e17a1c8231f1	super_manager	0	2026-02-12 20:12:21.40411	t	f	17	0	\N	\N	2026-02-13 08:49:08.441
12	deric	fdc15cab618062c55869232badd8a5f2c34659ae0675046f4c717158b26aec6d9c320899087ab18a9ccd9b0e45a30cc96783d1ab6f68857a38408f49c2ba0bc2.ec2b7bd312d0a8f99feccf13ef80e2a6	user	0	2026-02-09 20:05:33.750266	t	f	11	0	\N	\N	2026-02-11 12:48:24.949
13	Guest_7AF125	6939d997b9f0f3984f52db0c59475c24	user	0	2026-02-09 20:42:21.049219	t	f	\N	0	\N	\N	2026-02-09 20:42:45.254
11	john	57ecbc387c35049149034e36185cf48934d434a0945a47bfff8a16c3f091d25196a45ed94320d1d55d4143550ea33dd45449e6e9d11a221b5496dfb1d59c383f.0e4e198b13ef908314a5dcfae1df030a	manager	0	2026-02-09 11:37:02.467479	t	f	2	0	\N	112244	2026-02-19 17:46:56.508
15	Guest_6BBBD6	f810349b7ff053d38c65bc9c2f051569	user	0	2026-02-12 08:30:48.022928	t	f	9	0	\N	\N	2026-02-12 08:34:00.06
27	Walter	cfffb9455a815fbec679f7d2a1f26131d39b8e54a44484b9389b023de6b6103314434d6f13fde4374a55dae6208b9d5f41df872a2e45fa0df7cd98d519d9a03c.f41fa4e1c97713773a1d32860732d238	manager	0	2026-03-09 14:04:12.748136	t	f	20	0	0763304814	777788	2026-03-09 14:07:11.55
2	manager	c687c26187943e05aba978d095c600159588c385f61f51b8e411a20a2c66165a397fd4e0e62745a39600c257ebf4a4fede1682bd3da86c1dd4f42e79e2155c21.70812d37f4ee3c38c06e06293dfcf36d	super_manager	0	2026-01-16 11:52:24.778764	t	f	\N	30	\N	\N	2026-02-13 08:52:50.515
22	Guest_26E24C	f911639062268e8317d8a7384b333045	user	375	2026-02-16 18:47:21.66102	t	f	9	0	\N	\N	2026-02-16 19:06:26.016
25	Guest_317EE0	4c5cddc777ae4f63e35599c9a6409df0	user	8950	2026-02-22 11:34:29.426788	t	f	9	0	\N	\N	2026-02-22 11:36:56.538
24	Guest_2C08E6	da4b6e49a264d23c1df6f8abef30830d	user	6750	2026-02-19 19:18:19.292012	t	f	9	0	\N	\N	2026-02-19 21:15:59.965
20	Jona	7c1cafd7c87282552d6d80c35164e93ac3c193e0675f32b609e7bb173168ff3865b1dbeb585c830a9999371291c3e431cc608e5c04983e9ea6737012a1b34b60.b7054f49e16210da5b5cba5b02d14034	super_manager	0	2026-02-12 20:20:34.874702	t	f	17	0	\N	\N	2026-03-09 14:04:13.276
23	Guest_260270	405ae5d0541ceee461ceb7e092452b70	user	275	2026-02-19 17:28:21.92422	t	f	9	0	\N	\N	2026-02-19 17:45:24.648
21	Guest_2D52DB	99553d9cd2c9142ec8218d62fb5a0260	user	5000	2026-02-16 15:52:36.837417	t	f	9	0	\N	\N	2026-02-16 15:54:16.332
9	Admin	3b92cae723a0d2afe87af7661ec402ae8e063f738d10349cd13ae5af2f613cf9053c73b151aec967c26db4d10b3888482a141b4077f7f123074e805daf2748ea.435e5ac8b20cafb67ae516730bd0492e	admin	325	2026-02-08 09:55:37.358281	t	f	\N	0	\N	\N	2026-03-10 17:23:01.543
28	Guest_B32482	9781ba6e734b09b7e1e7df58951e8b89	user	4400	2026-03-09 14:10:26.401046	t	f	9	0	\N	\N	2026-03-09 14:22:02.004
\.


--
-- Data for Name: vouchers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vouchers (id, code, amount, created_by, redeemed_by, is_redeemed, created_at) FROM stdin;
1	653D8271	1000	1	4	t	2026-01-16 12:06:28.885446
2	937FBE79	1000	1	4	t	2026-01-19 00:26:40.739852
3	B9E04730	1000	1	4	t	2026-01-19 00:50:16.75846
4	7F8D6EAB	2000	1	5	t	2026-01-19 09:14:11.145966
5	B4FB5180	4000	1	5	t	2026-01-19 09:21:08.927296
6	F6A10FF0	1000	1	5	t	2026-01-21 05:16:29.448291
7	422F3123	2000	1	6	t	2026-01-22 06:09:44.091632
8	632E76C7	1000	1	7	t	2026-01-22 10:51:33.85708
9	ED24F351	1000	1	4	t	2026-01-22 20:17:09.160563
10	BDD6D3C9	100	9	\N	f	2026-02-08 20:10:01.874924
11	A18AC66C	1000	9	9	t	2026-02-08 20:10:25.381417
12	D5064BC2	1000	9	9	t	2026-02-08 20:17:03.21743
13	BD472223	5000	9	9	t	2026-02-09 17:10:20.123924
14	EEC20B6C	20000	9	9	t	2026-02-09 17:14:20.365022
15	390ED61C	1000	11	13	t	2026-02-09 20:41:57.218724
16	9E6D0824	1000	11	12	t	2026-02-09 20:44:39.734481
17	A192BB5C	1500	11	14	t	2026-02-09 21:21:24.003244
18	3DE050BD	500	11	12	t	2026-02-09 21:23:52.820883
19	8E2A9964	2000	9	9	t	2026-02-11 20:18:13.545359
20	37C87E2F	5000	9	15	t	2026-02-12 08:29:41.787646
21	C419CDB3	5000	9	16	t	2026-02-12 14:03:43.606337
22	A9DB41EA	3000	17	18	t	2026-02-12 20:02:06.466256
23	DAF5C257	5000	9	9	t	2026-02-15 14:26:54.828547
24	0B1C72F1	5000	9	21	t	2026-02-16 15:52:02.139088
25	B34DF382	10000	9	22	t	2026-02-16 18:44:49.445653
26	F8E55B7B	10000	9	23	t	2026-02-19 17:27:54.800607
27	D9C4E453	10000	9	24	t	2026-02-19 18:52:39.304464
28	296C205E	10000	9	9	t	2026-02-21 05:04:59.648805
29	127C18D1	10000	9	9	t	2026-02-22 08:58:14.487201
30	517D14D9	10000	9	25	t	2026-02-22 11:33:53.054628
31	9F4C6B57	10000	9	9	t	2026-02-24 17:56:45.283655
32	A115072F	5000	9	26	t	2026-02-25 15:16:44.853925
33	CBB53697	10000	9	\N	f	2026-03-02 13:34:05.000139
34	D01BCF21	5000	9	9	t	2026-03-02 13:37:14.470481
35	33BA88DC	10000	9	28	t	2026-03-09 14:09:51.091255
\.


--
-- Data for Name: withdrawal_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.withdrawal_requests (id, user_id, amount, status, created_at, processed_at, processed_by, manager_code, manager_id) FROM stdin;
1	5	1000	approved	2026-01-19 09:19:16.580985	2026-01-19 09:21:41.036	1	\N	\N
2	5	5000	approved	2026-01-19 09:26:08.674756	2026-01-19 09:26:47.187	1	\N	\N
3	23	2000	approved	2026-02-19 17:45:13.411952	2026-02-19 17:46:56.006	11	112244	11
\.


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE SET; Schema: _system; Owner: neondb_owner
--

SELECT pg_catalog.setval('_system.replit_database_migrations_v1_id_seq', 2, true);


--
-- Name: admin_security_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.admin_security_answers_id_seq', 8, true);


--
-- Name: broadcast_dismissals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.broadcast_dismissals_id_seq', 7, true);


--
-- Name: broadcasts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.broadcasts_id_seq', 4, true);


--
-- Name: game_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.game_settings_id_seq', 71, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.messages_id_seq', 3, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1537, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 28, true);


--
-- Name: vouchers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.vouchers_id_seq', 35, true);


--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.withdrawal_requests_id_seq', 3, true);


--
-- Name: replit_database_migrations_v1 replit_database_migrations_v1_pkey; Type: CONSTRAINT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1
    ADD CONSTRAINT replit_database_migrations_v1_pkey PRIMARY KEY (id);


--
-- Name: admin_security_answers admin_security_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_security_answers
    ADD CONSTRAINT admin_security_answers_pkey PRIMARY KEY (id);


--
-- Name: broadcast_dismissals broadcast_dismissals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.broadcast_dismissals
    ADD CONSTRAINT broadcast_dismissals_pkey PRIMARY KEY (id);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: game_settings game_settings_game_type_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_settings
    ADD CONSTRAINT game_settings_game_type_unique UNIQUE (game_type);


--
-- Name: game_settings game_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.game_settings
    ADD CONSTRAINT game_settings_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vouchers vouchers_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_code_unique UNIQUE (code);


--
-- Name: vouchers vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_replit_database_migrations_v1_build_id; Type: INDEX; Schema: _system; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_replit_database_migrations_v1_build_id ON _system.replit_database_migrations_v1 USING btree (build_id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict RDbYWIzBuRaMR4nmo0Wfa61B0H9mwTCevrfiq6dWcWKLI9LXEMwN34sIwknMA3h

