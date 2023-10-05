// @flow
import React, {useEffect, useRef, useState} from 'react';
import Select from 'react-select';
import debounce from 'lodash/debounce';
import {loader} from 'graphql.macro';
import {Utils} from './index';

const fetchRepoNames = loader('lib/graphql/fetchRepoNames.graphql');

type Props = {
  apolloClient: any,
};

const TypeAhead = (props: Props) => {
  const {apolloClient} = props;
  const [userInput, setUserInput] = useState('');
  const [repositoryOptions, setRepositoryOptions] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [selectedValue, setSelectedValue] = useState({label: '', value: ''});
  const [inFocus, setInFocus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRepositoryList = async (filter, appendToExistingList = false) => {
    try {
      setIsLoading(true);
      const {data} = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: fetchRepoNames,
        variables: {
          after: cursor,
          first: 12,
          sortModel: [{colId: 'repository', sort: 'asc'}],
          where: {
            filterModel: {
              repository: {
                condition1: {
                  filter,
                  filterType: 'text',
                  type: 'contains',
                },
                filterType: 'text',
                operator: 'AND',
              },
            },
          },
        },
      });
      const {
        repositories: {pageInfo},
      } = data;
      const newRepositoryOptions: Data = Utils.getNodes(data.repositories)
        .map(repo => ({
          isPersonal: repo?.project.isPersonal,
          isPublic: repo?.isPublic,
          name: repo?.repository,
          project: repo?.project?.project,
          source: repo?.project?.source,
        }))
        .map(repo => ({
          label: repo.name,
          value: repo,
        }));
      if (appendToExistingList) {
        setRepositoryOptions(repoOptions => [
          ...repoOptions,
          ...newRepositoryOptions,
        ]);
      } else {
        setRepositoryOptions(newRepositoryOptions);
      }
      setHasNextPage(pageInfo.hasNextPage);
      setCursor(pageInfo.endCursor);
      setIsLoading(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching results:', error);
      setIsLoading(false);
    }
  };

  const debouncedSearch = useRef(debounce(fetchRepositoryList, 500)).current;

  useEffect(
    () => {
      if (userInput) {
        debouncedSearch(userInput);
      }
    },
    [userInput],
  );

  useEffect(
    () => () => {
      debouncedSearch.cancel();
    },
    [debouncedSearch],
  );

  const handleMenuScrollToBottom = () => {
    if (hasNextPage && !isLoading) {
      fetchRepositoryList(userInput, true);
    }
  };

  return (
    <Select
      blurInputOnSelect
      className="dropdown"
      classNamePrefix="customDropdown"
      defaultOptions={repositoryOptions}
      isLoading={isLoading}
      onBlur={() => setInFocus(false)}
      onChange={selectedOption => setSelectedValue(selectedOption)}
      onFocus={() => setInFocus(true)}
      onInputChange={inputValue => {
        setUserInput(inputValue);
        if (!inputValue) setRepositoryOptions([]);
      }}
      onMenuScrollToBottom={handleMenuScrollToBottom}
      options={repositoryOptions}
      placeholder=""
      value={selectedValue}
    />
  );
};

export default TypeAhead;
