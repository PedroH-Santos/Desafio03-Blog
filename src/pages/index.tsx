import { GetStaticProps } from 'next';
import { getPrismicClient } from '../services/prismic';
import { FiUser } from 'react-icons/fi';
import { AiOutlineCalendar } from 'react-icons/ai';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useState } from 'react';
import Link from 'next/link';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  //   // TODO

  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState<String>(postsPagination.next_page);
  const [currentPage, setCurrentPage] = useState(1);


  let hadPagination = false;
  if (postsPagination.next_page != null) {
    hadPagination = true;
  }
  return !hadPagination ? (
    <main className={styles.container}>

      {posts.map(post => (
        <div className={styles.postContainer} >
          <Link href={`/post/${post.uid}`}>
            <a>
              <strong> {post.data.title} </strong>
              <p > {post.data.subtitle} </p>
              <div className={styles.containerInfo} >
                <time> <AiOutlineCalendar /> {post.first_publication_date} </time>
                <p> <FiUser /> {post.data.author}</p>
              </div>
            </a>
          </Link>
        </div>
      ))
      }

    </main >
  ) : (
    <main className={styles.container}>

      {posts.map(post => (
        <div className={styles.postContainer} key={post.uid} >
          <Link href={`/post/${post.uid}`}>

            <a>
              <strong> {post.data.title} </strong>
              <p > {post.data.subtitle} </p>
              <div className={styles.containerInfo} >
                <time> <AiOutlineCalendar /> {post.first_publication_date} </time>
                <p> <FiUser /> {post.data.author}</p>
              </div>
            </a>
          </Link>
        </div>
      ))}
      <button onClick={handleNextPage} > Carregar mais posts </button>
    </main>
  );



  async function handleNextPage(): Promise<void> {

    if (currentPage !== 1 || nextPage == null) {
      return;
    }

    let postsResponse = await fetch(`${nextPage}`).then(response => response.json());

    setNextPage(postsResponse.next_page);
    setCurrentPage(postsResponse.page);

    const publications = postsResponse.results.map(publication => {
      return {
        uid: publication.uid,
        first_publication_date: format(new Date(publication.last_publication_date), 'dd.MMM.yyyy', { locale: ptBR, }),
        data: {
          title: publication.data.title,
          subtitle: publication.data.subtitle,
          author: publication.data.author,
        }

      }
    });

    setPosts([...posts, ...publications]);



  }
}




export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
    pageSize: 1,
  });
  const publications = postsResponse.results.map(publication => {
    return { 
      uid: publication.uid,
      first_publication_date: format(new Date(publication.first_publication_date), 'dd MMM yyyy.', { locale: ptBR, }),
      data: {
        title: publication.data.title,
        subtitle: publication.data.subtitle,
        author: publication.data.author,
      }
 
    }
  });

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: publications,

  }
  return {
    props: { postsPagination }
  };
};
